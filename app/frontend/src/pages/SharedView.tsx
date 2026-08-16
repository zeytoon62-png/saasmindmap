import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { client } from "@/lib/api";
import { MindMapData } from "@/types/mindmap";
import { MindMapCanvas, MindMapCanvasHandle } from "@/components/MindMapCanvas";
import { Lock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewState = "loading" | "password" | "expired" | "notfound" | "ready";

export default function SharedView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const canvasRef = useRef<MindMapCanvasHandle>(null);

  const fetchShared = useCallback(async (pwd?: string) => {
    if (!token) return;
    try {
      const url = pwd
        ? `/api/v1/admin/shared/${token}?password=${encodeURIComponent(pwd)}`
        : `/api/v1/admin/shared/${token}`;
      const res = await client.apiCall.invoke({ url, method: "GET", data: {} });
      const result = res as any;
      const body = result?.data || result;

      if (body?.needs_password) {
        setState("password");
        return;
      }
      if (body?.has_data && body?.data) {
        try {
          const parsed = JSON.parse(body.data);
          setMapData(parsed);
          setState("ready");
        } catch {
          setState("notfound");
        }
        return;
      }
      setState("notfound");
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 410) {
        setState("expired");
      } else if (status === 403) {
        setError("Invalid password");
        setState("password");
      } else if (status === 404) {
        setState("notfound");
      } else {
        setState("notfound");
      }
    }
  }, [token]);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  const handlePasswordSubmit = () => {
    setError("");
    fetchShared(password);
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-700">Link Expired</h2>
        <p className="text-sm text-slate-500">This shared mind map link has expired and is no longer available.</p>
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-lg font-semibold text-slate-700">Not Found</h2>
        <p className="text-sm text-slate-500">This shared link does not exist or has been removed.</p>
      </div>
    );
  }

  if (state === "password") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white rounded-xl shadow-lg p-6 w-80 max-w-full">
          <div className="flex flex-col items-center gap-3 mb-4">
            <Lock className="w-10 h-10 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-700">Password Required</h2>
            <p className="text-sm text-slate-500 text-center">This shared mind map is protected. Enter the password to view it.</p>
          </div>
          {error && <p className="text-xs text-red-500 mb-2 text-center">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-blue-300"
            onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
            autoFocus
          />
          <Button onClick={handlePasswordSubmit} className="w-full cursor-pointer">
            View Mind Map
          </Button>
        </div>
      </div>
    );
  }

  // Ready state - show read-only canvas
  if (!mapData) return null;

  return (
    <div className="w-full h-screen bg-white relative">
      <MindMapCanvas
        ref={canvasRef}
        root={mapData.root}
        selectedNodeId={null}
        editingNodeId={null}
        isRTL={false}
        labels={{
          zoomIn: "Zoom In",
          zoomOut: "Zoom Out",
          resetView: "Reset View",
          fitToScreen: "Fit to Screen",
        }}
        onSelectNode={() => {}}
        onStartEdit={() => {}}
        onFinishEdit={() => {}}
        onAddChild={() => {}}
        onReparentNode={() => {}}
        readOnly
      />
      <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-500 border border-slate-200">
        Shared Mind Map (Read Only)
      </div>
    </div>
  );
}