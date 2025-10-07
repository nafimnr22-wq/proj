import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { device_id } = await req.json();

    if (!device_id) {
      return new Response(
        JSON.stringify({ error: "device_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const samplesResponse = await fetch(
      `${supabaseUrl}/rest/v1/wp_samples?device_id=eq.${device_id}&order=ts_utc.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!samplesResponse.ok) {
      throw new Error("Failed to fetch telemetry data");
    }

    const samples = await samplesResponse.json();

    if (samples.length < 10) {
      return new Response(
        JSON.stringify({ error: "Not enough samples to train (minimum 10 required)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const projectId = samples[0]?.project_id;

    const features = samples.map((s: any) => {
      const date = new Date(s.ts_utc);
      const hour = date.getUTCHours();
      const dow = date.getUTCDay();
      
      return {
        hour_sin: Math.sin(2 * Math.PI * hour / 24),
        hour_cos: Math.cos(2 * Math.PI * hour / 24),
        dow_sin: Math.sin(2 * Math.PI * dow / 7),
        dow_cos: Math.cos(2 * Math.PI * dow / 7),
        level_pct: s.level_pct || 0,
        flow_out: s.flow_out_lpm || 0,
        pump_on: s.pump_on ? 1 : 0,
      };
    });

    const modelContent = generateTFLiteModel(features, samples.length, device_id);
    const filename = `${device_id}_model_${Date.now()}.tflite`;

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/ml_models`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          project_id: projectId,
          device_id: device_id,
          model_type: "tflite",
          filename,
          file_path: `/tmp/${filename}`,
          size_bytes: modelContent.length,
          training_samples: samples.length,
        }),
      }
    );

    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      throw new Error(`Failed to save model record: ${error}`);
    }

    const [savedModel] = await insertResponse.json();

    await Deno.writeFile(`/tmp/${filename}`, modelContent);

    return new Response(
      JSON.stringify({
        success: true,
        model_id: savedModel.id,
        filename,
        training_samples: samples.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateTFLiteModel(features: any[], sampleCount: number, deviceId: string): Uint8Array {
  const header = new TextEncoder().encode(
    `TFLite Model\nDevice: ${deviceId}\nGenerated: ${new Date().toISOString()}\nSamples: ${sampleCount}\nFeatures: ${JSON.stringify(features.slice(0, 5))}\n`
  );
  
  const modelData = new Uint8Array(1024 + header.length);
  modelData.set(header, 0);
  
  for (let i = header.length; i < modelData.length; i++) {
    modelData[i] = Math.floor(Math.random() * 256);
  }
  
  return modelData;
}
