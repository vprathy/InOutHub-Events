import requests
import json
import sys
import argparse

def run_pilot_test(manual_prompt=None, mode='Image'):
    """
    Final Pilot Verification Script (v16.2.0)
    Tests the Supabase Edge Function -> Vertex AI (Gemini 2.5 + Veo/Lyria/Imagen) pipeline.
    """
    # Production Infrastructure (Ohio us-east-2)
    URL = "https://qnucfdnjmcaklbwohnuj.supabase.co/functions/v1/generate-act-assets"
    
    # Public Anon Key (Bypass via --no-verify-jwt)
    ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudWNmZG5qbWNha2xid29obnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTQ2MjQsImV4cCI6MjA4ODc3MDYyNH0.sPf5EAe6HUKcsUsrCubBpfuPsfy0D95U1H-yD3IB7uI"
    
    # Target: Victor Barrows (The sophisticated Magic Show)
    ACT_ID = "cf42e9c2-c719-4925-89ef-3d332208720f"
    
    headers = {
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json",
        "x-inouthub-trust": "inouthub-internal-2026-v16"
    }
    
    payload = {
        "actId": ACT_ID,
        "mode": mode
    }
    
    if manual_prompt:
        payload["manualPrompt"] = manual_prompt

    print(f"\n🚀 [Pilot Test] Initializing Production Handshake (v16.2.0)...")
    print(f"📍 Origin: Ohio (us-east-2)")
    print(f"📍 Mode: {mode}")
    print(f"📡 Endpoint: {URL}")
    print(f"📦 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(URL, headers=headers, json=payload, timeout=120)
        
        print(f"\n📥 [Handshake Result]")
        print(f"Status Code: {response.status_code}")
        
        try:
            result = response.json()
        except Exception:
            print(f"❌ PIPELINE ERROR: Received non-JSON response from server.")
            print(f"--- PREVIEW ---\n{response.text[:500]}\n---------------")
            return
        
        if response.status_code == 200:
            if result.get("isPending"):
                print(f"✅ PIPELINE ACTIVE: {result.get('message', 'Reviewing for Brand Safety')}")
            else:
                print(f"🔥 SUCCESS: {mode} Generated!")
                print(f"🔗 Public URL: {result.get('publicUrl')}")
        else:
            print(f"❌ PIPELINE ERROR: {result.get('error', 'Unknown Error')}")
            
    except Exception as e:
        print(f"☢️ CRITICAL FAILURE: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run pilot test for asset generation.")
    parser.add_argument("prompt", nargs='?', default=None, help="Manual prompt for asset generation")
    parser.add_argument("--mode", choices=["Image", "Video", "Audio", "Background"], default="Image", help="Asset type to generate")
    
    args = parser.parse_args()
            
    run_pilot_test(args.prompt, args.mode)
