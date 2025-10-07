import os, sys, json, argparse, time
import numpy as np, pandas as pd
import mysql.connector

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
try:
    import tensorflow as tf
except Exception:
    tf = None

def log(msg): print(msg, flush=True)

def load_data(project, db_cfg):
    conn = mysql.connector.connect(**db_cfg)
    q = "SELECT ts, level_cm, level_pct, pump_on, flow_out_lpm FROM samples WHERE project_id=%s ORDER BY ts ASC"
    df = pd.read_sql(q, conn, params=[project]); conn.close(); return df

def build_features(df, horizon_min=30, pct=0.8):
    if df.empty: return (pd.DataFrame(), np.zeros((0,1), dtype=np.float32)), {"feature_names":[]}
    df['t'] = pd.to_datetime(df['ts'], unit='ms', utc=True)
    df['hour'] = df['t'].dt.hour; df['dow'] = df['t'].dt.dayofweek
    df['hour_sin']=np.sin(2*np.pi*df['hour']/24); df['hour_cos']=np.cos(2*np.pi*df['hour']/24)
    df['dow_sin']=np.sin(2*np.pi*df['dow']/7); df['dow_cos']=np.cos(2*np.pi*df['dow']/7)
    for col in ['level_cm','level_pct','flow_out_lpm']:
        df[col]=pd.to_numeric(df.get(col,0), errors='coerce').fillna(method='ffill').fillna(0.0)
    def ema(a,alpha): out=[]; s=None
    for v in a: s=v if s is None else alpha*v+(1-alpha)*s; out.append(s)
    return out
    df['lvl_ema']=ema(df['level_pct'].values,0.1); df['flow_ema']=ema(df['flow_out_lpm'].values,0.2)
    thr = df['flow_ema'].quantile(pct) if len(df) else 0.0
    df['rush'] = (df['flow_ema']>thr).astype(int)
    shift=max(1,int(horizon_min)); df['rush_future']=df['rush'].shift(-shift).fillna(0).astype(int)
    feat=['hour_sin','hour_cos','dow_sin','dow_cos','lvl_ema','flow_ema']
    X=df[feat].values.astype(np.float32); y=df['rush_future'].values.astype(np.float32).reshape(-1,1)
    if len(X)>shift: X=X[:-shift]; y=y[:-shift]
    meta={"feature_names":feat,"version":"1.0","horizon_min":horizon_min,"pct":pct,"created":time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    return (pd.DataFrame(X,columns=feat), y), meta

def tiny_model(input_dim):
    if tf is None: return None
    m=tf.keras.Sequential([tf.keras.layers.Input(shape=(input_dim,),dtype=tf.float32,name="features"),
                           tf.keras.layers.Dense(8,activation="relu"),
                           tf.keras.layers.Dense(1,activation="sigmoid",name="rush_prob")])
    m.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"]); return m

def export_tflite(model):
    if tf is None: return b"TFLITE_PLACEHOLDER"
    return tf.lite.TFLiteConverter.from_keras_model(model).convert()

def export_cc(tfl, var="g_model"):
    hexes=','.join(str(b) for b in tfl)
    return (f"#include <cstdint>\nextern const unsigned char {var}[];\nextern const unsigned int {var}_len;\n"
            f"const unsigned char {var}[] = {{ {hexes} }};\nconst unsigned int {var}_len = sizeof({var});\n").encode("utf-8")

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--project",required=True); ap.add_argument("--h",type=int,default=30); ap.add_argument("--pct",type=float,default=0.8)
    a=ap.parse_args()
    db_cfg=dict(host=os.environ.get("TANK_DB_HOST","127.0.0.1"),user=os.environ.get("TANK_DB_USER","root"),
                password=os.environ.get("TANK_DB_PASS",""),database=os.environ.get("TANK_DB_NAME","tankai"))
    model_dir=os.environ.get("TANK_MODEL_DIR","."); tmp_dir=os.environ.get("TANK_TMP_DIR",".")
    os.makedirs(model_dir,exist_ok=True); os.makedirs(tmp_dir,exist_ok=True)
    log(f"[info] project={a.project} h={a.h} pct={a.pct}")
    df=load_data(a.project, db_cfg)
    if df.empty or len(df)<50:
        X=np.random.randn(128,6).astype(np.float32); y=(np.random.rand(128,1)>0.7).astype(np.float32)
        meta={"feature_names":['hour_sin','hour_cos','dow_sin','dow_cos','lvl_ema','flow_ema'],"version":"1.0","horizon_min":a.h,"pct":a.pct,"created":time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),"note":"baseline"}
    else:
        (Xdf,y),meta=build_features(df,a.h,a.pct); X=Xdf.values.astype(np.float32); 
        if len(X)<10: X=np.random.randn(128,6).astype(np.float32); y=(np.random.rand(128,1)>0.7).astype(np.float32); meta["note"]="fallback"
    model=tiny_model(X.shape[1]) if tf is not None else None
    if model is not None: model.fit(X,y,epochs=10,batch_size=32,verbose=0)
    stamp=time.strftime("%Y%m%d_%H%M%S", time.gmtime())
    out_dir=os.path.join(model_dir, f"{a.project}", stamp); os.makedirs(out_dir,exist_ok=True)
    base=f"{a.project}_rush_{stamp}"
    tfl_path=os.path.join(out_dir, base+".tflite"); cc_path=os.path.join(out_dir, base+".cc"); meta_path=os.path.join(out_dir, f"{a.project}_meta.json")
    tfl=export_tflite(model); open(tfl_path,"wb").write(tfl); open(cc_path,"wb").write(export_cc(tfl)); open(meta_path,"w",encoding="utf-8").write(json.dumps(meta,ensure_ascii=False,indent=2))
    try:
        conn=mysql.connector.connect(**db_cfg); cur=conn.cursor()
        for typ,p in (('tflite',tfl_path),('cc',cc_path),('meta',meta_path)):
            cur.execute("INSERT INTO models (project_id,type,path,created_at) VALUES (%s,%s,%s,NOW())",(a.project,typ,p))
        conn.commit(); cur.close(); conn.close()
    except Exception as e: log(f"[warn] DB record failed: {e}")
    print(json.dumps({"ok":True,"project":a.project,"tflite":tfl_path,"cc":cc_path,"meta":meta_path,"samples_used":int(len(X)),"h":int(a.h),"pct":float(a.pct)})); return 0

if __name__=="__main__": sys.exit(main())
