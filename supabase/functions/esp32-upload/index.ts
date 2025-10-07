import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (req.method === "POST") {
      const body = await req.json();
      const { project_id, device_id, data_type, data } = body;

      if (!project_id || !device_id || !data_type || !data) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: device } = await supabase
        .from("devices")
        .select("device_id")
        .eq("device_id", device_id)
        .maybeSingle();

      if (!device) {
        return new Response(
          JSON.stringify({ error: "Device not registered. Please register first using /esp32-register" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let table: string;
      let insertData: any;

      if (data_type === "water_pump") {
        table = "wp_samples";
        insertData = {
          project_id,
          device_id,
          ts_utc: data.ts_utc || new Date().toISOString(),
          level_pct: data.level_pct,
          pump_on: data.pump_on,
          flow_out_lpm: data.flow_out_lpm,
          flow_in_lpm: data.flow_in_lpm,
          net_flow_lpm: data.net_flow_lpm,
          manual_switch_status: data.manual_switch_status !== undefined ? data.manual_switch_status : 0,
        };
      } else if (data_type === "smart_light") {
        table = "sl_samples";
        insertData = {
          project_id,
          device_id,
          ts_utc: data.ts_utc || new Date().toISOString(),
          brightness: data.brightness,
          power_w: data.power_w,
          color_temp: data.color_temp,
        };
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid data_type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: result, error } = await supabase
        .from(table)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: deviceData } = await supabase
        .from("devices")
        .select("pump_upper_threshold")
        .eq("device_id", device_id)
        .maybeSingle();

      const updateData: any = { updated_at: new Date().toISOString() };

      if (data_type === "water_pump" && deviceData && data.level_pct >= deviceData.pump_upper_threshold) {
        updateData.manual_switch = 0;
      }

      const { error: updateError } = await supabase
        .from("devices")
        .update(updateData)
        .eq("device_id", device_id);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
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