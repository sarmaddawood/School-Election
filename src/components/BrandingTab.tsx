import React, { useEffect, useState } from "react";
import { Building2, Save, ShieldCheck } from "lucide-react";
import { SchoolBranding } from "../types";

interface BrandingTabProps {
  branding: SchoolBranding;
  token: string;
  onUpdated: (branding: SchoolBranding) => void;
  setErrorNotification: (message: string) => void;
  setSuccessNotification: (message: string) => void;
}

export default function BrandingTab({
  branding,
  token,
  onUpdated,
  setErrorNotification,
  setSuccessNotification,
}: BrandingTabProps) {
  const [form, setForm] = useState(branding);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(branding), [branding]);

  const update = (field: keyof SchoolBranding, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save school branding");
      onUpdated(data);
      setSuccessNotification("School branding saved and applied across the portal.");
    } catch (error: any) {
      setErrorNotification(error.message || "Could not save school branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-[10px] font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">REUSABLE SCHOOL IDENTITY</span>
        <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight mt-2 flex items-center gap-2"><Building2 className="text-sky-600" /> School Branding Settings</h2>
        <p className="text-xs text-slate-500">Update the school identity used in navigation, headers, and portal information.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5"><span className="text-xs font-bold uppercase text-slate-600">School Name</span><input required value={form.schoolName} onChange={(e) => update("schoolName", e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500" /></label>
          <label className="space-y-1.5"><span className="text-xs font-bold uppercase text-slate-600">Portal Tagline</span><input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500" /></label>
          <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-bold uppercase text-slate-600">Logo URL</span><input value={form.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://... or /assets/logo.png" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500" /></label>
          <label className="space-y-1.5"><span className="text-xs font-bold uppercase text-slate-600">Primary Color</span><div className="flex gap-2"><input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-12 h-10 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer" /><input value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} pattern="#[0-9A-Fa-f]{6}" className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-sky-500" /></div></label>
          <label className="space-y-1.5"><span className="text-xs font-bold uppercase text-slate-600">Contact Email</span><input type="email" value={form.contactEmail || ""} onChange={(e) => update("contactEmail", e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500" /></label>
          <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-bold uppercase text-slate-600">School Address</span><textarea rows={2} value={form.address || ""} onChange={(e) => update("address", e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500 resize-none" /></label>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
          <ShieldCheck size={17} className="shrink-0" />
          <span>The permanent attribution is protected by the backend and cannot be changed: <strong>Developed by students of Bolinao School of Fisheries.</strong></span>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"><Save size={14} /> {saving ? "Saving..." : "Save Branding"}</button>
        </div>
      </form>
    </div>
  );
}
