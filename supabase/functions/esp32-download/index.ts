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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    if (req.method === "GET") {
      const url = new URL(req.url);
      const deviceId = url.searchParams.get("device_id");

      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: "device_id parameter required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("*, projects(*)")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (deviceError || !device) {
        return new Response(
          JSON.stringify({ error: "Device not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let firmware = null;
      if (device.auto_update) {
        const { data: latestFirmware, error: fwError } = await supabase
          .from("firmware")
          .select("*")
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestFirmware && !fwError) {
          firmware = {
            version: latestFirmware.version,
            filename: latestFirmware.filename,
            size_bytes: latestFirmware.size_bytes,
            sha256: latestFirmware.sha256,
          };
        }
      }

      const config = {
        device_id: device.device_id,
        project_id: device.project_id,
        project_type: device.projects.project_type,
        role: device.role,
        auto_update: device.auto_update,
        tank_shape: device.tank_shape,
        height_cm: device.height_cm,
        width_cm: device.width_cm,
        length_cm: device.length_cm,
        firmware: firmware,
      };

      return new Response(
        JSON.stringify(config),
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
