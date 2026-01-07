"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";

type BusinessProfile = {
  services: string[];
  delivery_methods: string[];
  pricing_models: string[];
  pricing_notes?: string | null;
  subjects: string[];
  location?: string | null;
  target_audience?: string | null;
  brand_voice?: string | null;
  notes?: string | null;
};

type SitePage = {
  id: string;
  title: string;
  slug: string;
  description: string;
  parent_id: string | null;
  order: number;
  status: string;
  template_id: string | null;
  service_type: string | null;
};

type SiteStructure = {
  pages: SitePage[];
};

type TopicTag = {
  id: string;
  label: string;
  parent_id: string | null;
};

type TopicTaxonomy = {
  tags: TopicTag[];
};

type SiteIntakeProposal = {
  business_profile: BusinessProfile;
  site_structure: SiteStructure;
  topic_taxonomy: TopicTaxonomy;
  review?: { approved?: boolean; changes_requested?: string | null };
  metadata?: { schema_version?: string; generated_at?: string };
};

type BusinessProfileRecord = {
  id: number;
  name: string | null;
  description: string | null;
  profile_data: BusinessProfile | null;
  status: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
};

type SiteStructureRecord = {
  id: number;
  status: string;
  structure_data: SiteStructure | null;
  created_at: string;
  approved_at: string | null;
};

type TopicTaxonomyRecord = {
  id: number;
  status: string;
  taxonomy_data: TopicTaxonomy | null;
  created_at: string;
  approved_at: string | null;
};

type TopicTaxonomyChange = {
  id: number;
  taxonomy_id: number | null;
  status: string;
  change_type: string;
  taxonomy_data: TopicTaxonomy | null;
  created_by: string;
  source_run_id: string | null;
  created_at: string;
};

type PageConfigVersion = {
  id: number;
  parent_version_id: number | null;
  site_structure_version_id: number | null;
  page_id: string;
  config_data: Record<string, unknown> | unknown[] | null;
  selection_rules: Record<string, unknown> | unknown[] | null;
  taxonomy_snapshot_id: number | null;
  created_by: string;
  source_run_id: string | null;
  commit_classification: string;
  status: string;
  created_at: string;
};

type SiteIntakeState = {
  business_profile: BusinessProfileRecord | null;
  site_structure: SiteStructureRecord | null;
  topic_taxonomy: TopicTaxonomyRecord | null;
  business_profile_history: BusinessProfileRecord[];
  site_structure_history: SiteStructureRecord[];
  topic_taxonomy_history: TopicTaxonomyRecord[];
};

type IntakeStep = "profile" | "taxonomy" | "structure" | "review";

const DELIVERY_METHODS = [
  { key: "download", label: "Digital download" },
  { key: "prints", label: "Prints" },
  { key: "albums", label: "Albums" },
  { key: "in_person", label: "In-person reveal" },
  { key: "other", label: "Other" },
] as const;

const PRICING_MODELS = [
  { key: "hourly", label: "Hourly" },
  { key: "fixed_time", label: "Fixed session length" },
  { key: "per_image", label: "Per image" },
  { key: "package", label: "Packages" },
  { key: "license", label: "License" },
  { key: "other", label: "Other" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  empty: "Not started",
  ready: "Ready",
};

const AUTOSAVE_DELAY_MS = 900;

const emptyProfile: BusinessProfile = {
  services: [],
  delivery_methods: [],
  pricing_models: [],
  pricing_notes: null,
  subjects: [],
  location: null,
  target_audience: null,
  brand_voice: null,
  notes: null,
};

const emptyTaxonomy: TopicTaxonomy = { tags: [] };
const emptyStructure: SiteStructure = { pages: [] };

export default function SiteIntakePage() {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
  const apiFetch: typeof fetch = (input, init) =>
    globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });

  const [freeformInput, setFreeformInput] = useState("");
  const [guardrailMessage, setGuardrailMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toolRunId, setToolRunId] = useState<string | null>(null);

  const [services, setServices] = useState("");
  const [subjects, setSubjects] = useState("");
  const [location, setLocation] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryMethods, setDeliveryMethods] = useState<Set<string>>(new Set());
  const [pricingModels, setPricingModels] = useState<Set<string>>(new Set());
  const [changesRequested, setChangesRequested] = useState("");
  const [proposal, setProposal] = useState<SiteIntakeProposal | null>(null);

  const [taxonomyDraft, setTaxonomyDraft] = useState<TopicTaxonomy>(
    emptyTaxonomy
  );
  const [draftStructure, setDraftStructure] = useState<SiteStructure>(
    emptyStructure
  );
  const [newTagLabel, setNewTagLabel] = useState("");

  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageParent, setNewPageParent] = useState<string | null>(null);
  const [newPageDescription, setNewPageDescription] = useState("");
  const [structureChangeRequest, setStructureChangeRequest] = useState("");
  const [structureChangeSummary, setStructureChangeSummary] = useState<
    string[] | null
  >(null);

  const [intakeState, setIntakeState] = useState<SiteIntakeState | null>(null);
  const [activeStep, setActiveStep] = useState<IntakeStep>("profile");
  const [stateLoading, setStateLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showTaxonomyLog, setShowTaxonomyLog] = useState(false);
  const [showPageConfigPanel, setShowPageConfigPanel] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [taxonomyLog, setTaxonomyLog] = useState<TopicTaxonomyChange[]>([]);
  const [taxonomyLogLoading, setTaxonomyLogLoading] = useState(false);
  const [taxonomyRestoreId, setTaxonomyRestoreId] = useState<number | null>(null);
  const [pageConfigPageId, setPageConfigPageId] = useState<string>("");
  const [pageConfigStatus, setPageConfigStatus] = useState<"draft" | "approved">(
    "draft"
  );
  const [pageConfigData, setPageConfigData] = useState("{\n\n}");
  const [pageConfigRules, setPageConfigRules] = useState("{\n\n}");
  const [pageConfigHistory, setPageConfigHistory] = useState<PageConfigVersion[]>([]);
  const [pageConfigLoading, setPageConfigLoading] = useState(false);
  const [pageConfigHistoryLoading, setPageConfigHistoryLoading] = useState(false);

  const [proposing, setProposing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTaxonomy, setSavingTaxonomy] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);
  const [structureChangeLoading, setStructureChangeLoading] = useState(false);

  const lastSavedProfileRef = useRef<string>("");
  const lastSavedTaxonomyRef = useRef<string>("");
  const lastSavedStructureRef = useRef<string>("");

  const profileStatus = intakeState?.business_profile?.status ?? "empty";
  const taxonomyStatus = intakeState?.topic_taxonomy?.status ?? "empty";
  const structureStatus = intakeState?.site_structure?.status ?? "empty";
  const profileApproved = profileStatus === "approved";
  const structureApproved = structureStatus === "approved";
  const taxonomyApproved = taxonomyStatus === "approved";
  const intakeComplete = profileApproved && structureApproved && taxonomyApproved;

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const buildProfilePayload = (): BusinessProfile => ({
    services: parseList(services),
    delivery_methods: Array.from(deliveryMethods),
    pricing_models: Array.from(pricingModels),
    pricing_notes: pricingNotes.trim() || null,
    subjects: parseList(subjects),
    location: location.trim() || null,
    target_audience: targetAudience.trim() || null,
    brand_voice: brandVoice.trim() || null,
    notes: notes.trim() || null,
  });

  const profilePayload = useMemo(() => buildProfilePayload(), [
    services,
    deliveryMethods,
    pricingModels,
    pricingNotes,
    subjects,
    location,
    targetAudience,
    brandVoice,
    notes,
  ]);

  const profilePayloadKey = useMemo(
    () => JSON.stringify(profilePayload),
    [profilePayload]
  );
  const taxonomyPayloadKey = useMemo(
    () => JSON.stringify(taxonomyDraft),
    [taxonomyDraft]
  );
  const structurePayloadKey = useMemo(
    () => JSON.stringify(draftStructure),
    [draftStructure]
  );

  const lastSavedAt = useMemo(() => {
    if (!intakeState) return null;
    const toMs = (value: string | null | undefined) =>
      value ? new Date(value).getTime() : 0;
    const candidates = [
      intakeState.business_profile?.updated_at,
      intakeState.business_profile?.created_at,
      intakeState.topic_taxonomy?.created_at,
      intakeState.site_structure?.created_at,
    ];
    const max = Math.max(...candidates.map(toMs));
    if (!max) return null;
    return new Date(max).toISOString();
  }, [intakeState]);

  const proposalJson = useMemo(() => {
    if (!proposal) return "";
    return JSON.stringify(proposal, null, 2);
  }, [proposal]);

  useEffect(() => {
    void loadIntakeState();
  }, []);

  useEffect(() => {
    if (!intakeState) return;
    if (profilePayloadKey === lastSavedProfileRef.current) return;
    const timer = setTimeout(() => {
      void saveBusinessProfile({ status: "draft", profile: profilePayload });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [profilePayloadKey, intakeState, profilePayload]);

  useEffect(() => {
    if (!intakeState) return;
    if (taxonomyPayloadKey === lastSavedTaxonomyRef.current) return;
    const timer = setTimeout(() => {
      void saveTopicTaxonomy({ status: "draft", taxonomy: taxonomyDraft });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [taxonomyPayloadKey, intakeState, taxonomyDraft]);

  useEffect(() => {
    if (!intakeState) return;
    if (structurePayloadKey === lastSavedStructureRef.current) return;
    const timer = setTimeout(() => {
      void saveSiteStructure({ status: "draft", structure: draftStructure });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [structurePayloadKey, intakeState, draftStructure]);

  useEffect(() => {
    const hasPendingSave = savingProfile || savingTaxonomy || savingStructure;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingSave) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [savingProfile, savingTaxonomy, savingStructure]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!showHistoryPanel) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowHistoryPanel(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showHistoryPanel]);

  const handleFreeformSubmit = () => {
    const text = freeformInput.trim().toLowerCase();
    if (!text) return;
    if (text.includes("image") || text.includes("photo")) {
      router.push("/admin/photos");
      setFreeformInput("");
      return;
    }
    if (text.includes("structure") || text.includes("page")) {
      setActiveStep("structure");
      setFreeformInput("");
      return;
    }
    if (text.includes("tag") || text.includes("taxonomy")) {
      setActiveStep("taxonomy");
      setFreeformInput("");
      return;
    }
    if (text.includes("build") || text.includes("profile") || text.includes("intake")) {
      setActiveStep("profile");
      setFreeformInput("");
      return;
    }
    setGuardrailMessage(
      "That request is outside the current site intake workflow. Try: update profile, adjust taxonomy, edit structure, or manage site images."
    );
  };

  const toggleSetValue = (
    setFn: Dispatch<SetStateAction<Set<string>>>,
    key: string
  ) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const normalizeTagId = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, " ")
      .trim()
      .replace(/\s+/g, "-") || "tag";

  const addTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const id = normalizeTagId(label);
    if (taxonomyDraft.tags.some((tag) => tag.id === id)) {
      setNewTagLabel("");
      return;
    }
    setTaxonomyDraft((prev) => ({
      tags: [...prev.tags, { id, label, parent_id: null }],
    }));
    setNewTagLabel("");
  };

  const removeTag = (id: string) => {
    setTaxonomyDraft((prev) => ({
      tags: prev.tags.filter((tag) => tag.id !== id),
    }));
  };

  const handleProposal = async (
    { includeTaxonomy = true }: { includeTaxonomy?: boolean } = {}
  ) => {
    setProposing(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/site/intake/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_profile: profilePayload,
          changes_requested: changesRequested.trim() || null,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as SiteIntakeProposal;
      const nextProposal = includeTaxonomy
        ? data
        : { ...data, topic_taxonomy: taxonomyDraft };
      setProposal(nextProposal);
      if (includeTaxonomy) {
        setTaxonomyDraft(data.topic_taxonomy);
        lastSavedTaxonomyRef.current = JSON.stringify(data.topic_taxonomy);
        await saveTopicTaxonomy({
          status: "draft",
          taxonomy: data.topic_taxonomy,
          forceNew: true,
        });
      }
      setDraftStructure(data.site_structure);
      lastSavedStructureRef.current = JSON.stringify(data.site_structure);
      await saveSiteStructure({
        status: "draft",
        structure: data.site_structure,
        forceNew: true,
      });
      setActionMessage(
        includeTaxonomy
          ? "Proposal ready. Review tags and structure."
          : "Structure draft ready. Review pages before approving."
      );
      setActiveStep(includeTaxonomy ? "taxonomy" : "structure");
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setProposing(false);
    }
  };

  const handleTaxonomyProposal = async () => {
    setProposing(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/site/intake/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_profile: profilePayload,
          site_structure: draftStructure,
          changes_requested: null,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as SiteIntakeProposal;
      const nextProposal = { ...data, site_structure: draftStructure };
      setProposal(nextProposal);
      setTaxonomyDraft(data.topic_taxonomy);
      lastSavedTaxonomyRef.current = JSON.stringify(data.topic_taxonomy);
      await saveTopicTaxonomy({
        status: "draft",
        taxonomy: data.topic_taxonomy,
        forceNew: true,
      });
      setActionMessage("Taxonomy draft ready. Review and approve.");
      setActiveStep("taxonomy");
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setProposing(false);
    }
  };

  const ensureToolRunId = async (): Promise<string> => {
    if (toolRunId) return toolRunId;
    const response = await apiFetch(`${apiBaseUrl}/api/v1/agent-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: "admin-site-intake",
        plan: null,
        run_metadata: { source: "admin-ui" },
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail ?? `HTTP ${response.status}`);
    }
    const run = (await response.json()) as { id: string };
    setToolRunId(run.id);
    return run.id;
  };

  const approveTool = async (approvalId: number) => {
    const response = await apiFetch(
      `${apiBaseUrl}/api/v1/approvals/${approvalId}/decision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          decided_by: "admin-ui",
        }),
      }
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail ?? `HTTP ${response.status}`);
    }
  };

  const executeTool = async (
    toolName: string,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const runId = await ensureToolRunId();
    const response = await apiFetch(`${apiBaseUrl}/api/v1/tools/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: runId,
        tool_name: toolName,
        input,
        requester: "admin-ui",
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail ?? `HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      status: string;
      output: Record<string, unknown> | null;
      approval_id?: number;
    };
    if (payload.status === "requires_approval" && payload.approval_id) {
      await approveTool(payload.approval_id);
      const retry = await apiFetch(`${apiBaseUrl}/api/v1/tools/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          tool_name: toolName,
          input,
          requester: "admin-ui",
          approval_id: payload.approval_id,
        }),
      });
      if (!retry.ok) {
        const detail = await retry.json().catch(() => ({}));
        throw new Error(detail.detail ?? `HTTP ${retry.status}`);
      }
      const retryPayload = (await retry.json()) as {
        status: string;
        output: Record<string, unknown> | null;
      };
      if (!retryPayload.output) {
        throw new Error("Tool returned no output.");
      }
      return retryPayload.output;
    }
    if (!payload.output) {
      throw new Error("Tool returned no output.");
    }
    return payload.output;
  };

  const saveBusinessProfile = async ({
    status,
    profile,
    forceNew,
  }: {
    status: "draft" | "approved";
    profile: BusinessProfile;
    forceNew?: boolean;
  }) => {
    setSavingProfile(true);
    setActionError(null);
    try {
      const commitClassification =
        status === "approved" ? "approval_required" : "safe_auto_commit";
      const proposal = {
        name: null,
        description: profile.notes ?? null,
        profile_data: profile,
        status,
        force_new: forceNew ?? false,
        commit_classification: commitClassification,
      };
      const toolName =
        status === "approved"
          ? "canonical.business_profile.approve"
          : "canonical.business_profile.create";
      const data = (await executeTool(
        toolName,
        proposal
      )) as unknown as BusinessProfileRecord;
      lastSavedProfileRef.current = JSON.stringify(profile);
      setIntakeState((prev) =>
        prev
          ? {
              ...prev,
              business_profile: data,
              business_profile_history: prev.business_profile_history,
            }
          : {
              business_profile: data,
              site_structure: null,
              topic_taxonomy: null,
              business_profile_history: [],
              site_structure_history: [],
              topic_taxonomy_history: [],
            }
      );
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveTopicTaxonomy = async ({
    status,
    taxonomy,
    forceNew,
  }: {
    status: "draft" | "approved";
    taxonomy: TopicTaxonomy;
    forceNew?: boolean;
  }) => {
    setSavingTaxonomy(true);
    setActionError(null);
    try {
      const commitClassification =
        status === "approved" ? "approval_required" : "safe_auto_commit";
      const toolName =
        status === "approved"
          ? "canonical.topic_taxonomy.approve"
          : "canonical.topic_taxonomy.create";
      const data = (await executeTool(toolName, {
        status,
        taxonomy_data: taxonomy,
        force_new: forceNew ?? false,
        commit_classification: commitClassification,
      })) as unknown as TopicTaxonomyRecord;
      lastSavedTaxonomyRef.current = JSON.stringify(taxonomy);
      setIntakeState((prev) =>
        prev
          ? {
              ...prev,
              topic_taxonomy: data,
              topic_taxonomy_history: prev.topic_taxonomy_history,
            }
          : {
              business_profile: null,
              site_structure: null,
              topic_taxonomy: data,
              business_profile_history: [],
              site_structure_history: [],
              topic_taxonomy_history: [],
            }
      );
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSavingTaxonomy(false);
    }
  };

  const saveSiteStructure = async ({
    status,
    structure,
    forceNew,
  }: {
    status: "draft" | "approved";
    structure: SiteStructure;
    forceNew?: boolean;
  }) => {
    setSavingStructure(true);
    setActionError(null);
    try {
      const commitClassification =
        status === "approved" ? "approval_required" : "safe_auto_commit";
      const proposal = {
        status,
        structure_data: structure,
        force_new: forceNew ?? false,
        commit_classification: commitClassification,
      };
      const toolName =
        status === "approved"
          ? "canonical.site_structure.approve"
          : "canonical.site_structure.create";
      const data = (await executeTool(
        toolName,
        proposal
      )) as unknown as SiteStructureRecord;
      lastSavedStructureRef.current = JSON.stringify(structure);
      setIntakeState((prev) =>
        prev
          ? {
              ...prev,
              site_structure: data,
              site_structure_history: prev.site_structure_history,
            }
          : {
              business_profile: null,
              site_structure: data,
              topic_taxonomy: null,
              business_profile_history: [],
              site_structure_history: [],
              topic_taxonomy_history: [],
            }
      );
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSavingStructure(false);
    }
  };

  const loadIntakeState = async () => {
    setStateLoading(true);
    setActionError(null);
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/site/intake/state`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as SiteIntakeState;
      setIntakeState(data);
      hydrateFromState(data);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setStateLoading(false);
    }
  };

  const handleReloadSaved = async () => {
    await loadIntakeState();
    setShowHistoryPanel(true);
    setShowTaxonomyLog(false);
    setShowPageConfigPanel(false);
    setShowSettingsPanel(false);
    setMenuOpen(false);
    setActionMessage("Loaded saved versions. Pick one to continue.");
  };

  const normalizeProfile = (
    profile: BusinessProfile | null | undefined
  ): BusinessProfile => ({
    services: Array.isArray(profile?.services) ? profile.services : [],
    delivery_methods: Array.isArray(profile?.delivery_methods)
      ? profile.delivery_methods
      : [],
    pricing_models: Array.isArray(profile?.pricing_models)
      ? profile.pricing_models
      : [],
    pricing_notes: profile?.pricing_notes ?? null,
    subjects: Array.isArray(profile?.subjects) ? profile.subjects : [],
    location: profile?.location ?? null,
    target_audience: profile?.target_audience ?? null,
    brand_voice: profile?.brand_voice ?? null,
    notes: profile?.notes ?? null,
  });

  const hydrateFromState = (data: SiteIntakeState) => {
    const profileData = normalizeProfile(data.business_profile?.profile_data);
    setServices(profileData.services.join(", "));
    setSubjects(profileData.subjects.join(", "));
    setLocation(profileData.location ?? "");
    setPricingNotes(profileData.pricing_notes ?? "");
    setTargetAudience(profileData.target_audience ?? "");
    setBrandVoice(profileData.brand_voice ?? "");
    setNotes(profileData.notes ?? "");
    setDeliveryMethods(new Set(profileData.delivery_methods));
    setPricingModels(new Set(profileData.pricing_models));
    lastSavedProfileRef.current = JSON.stringify(profileData);

    const taxonomyData = data.topic_taxonomy?.taxonomy_data ?? emptyTaxonomy;
    setTaxonomyDraft(taxonomyData);
    lastSavedTaxonomyRef.current = JSON.stringify(taxonomyData);

    const structureData = data.site_structure?.structure_data ?? emptyStructure;
    setDraftStructure(structureData);
    lastSavedStructureRef.current = JSON.stringify(structureData);

    const nextStep = pickActiveStep(data);
    setActiveStep(nextStep);
  };

  const pickActiveStep = (data: SiteIntakeState): IntakeStep => {
    const profile = data.business_profile;
    if (!profile || profile.status !== "approved") return "profile";
    const structure = data.site_structure;
    if (!structure || structure.status !== "approved") return "structure";
    const taxonomy = data.topic_taxonomy;
    if (!taxonomy || taxonomy.status !== "approved") return "taxonomy";
    return "review";
  };

  const handleApproveProfile = async () => {
    await saveBusinessProfile({ status: "approved", profile: profilePayload });
    await handleProposal({ includeTaxonomy: false });
  };

  const handleApproveTaxonomy = async () => {
    await saveTopicTaxonomy({ status: "approved", taxonomy: taxonomyDraft });
    setActionMessage("Taxonomy approved. Move to site review.");
    setActiveStep("review");
    await loadIntakeState();
  };

  const handleApproveStructure = async () => {
    await saveSiteStructure({ status: "approved", structure: draftStructure });
    await loadIntakeState();
    await handleTaxonomyProposal();
  };

  const resetFromProfile = async () => {
    setShowHistoryPanel(false);
    setServices("");
    setSubjects("");
    setLocation("");
    setPricingNotes("");
    setTargetAudience("");
    setBrandVoice("");
    setNotes("");
    setDeliveryMethods(new Set());
    setPricingModels(new Set());
    setTaxonomyDraft(emptyTaxonomy);
    setDraftStructure(emptyStructure);
    await saveBusinessProfile({ status: "draft", profile: emptyProfile, forceNew: true });
    await saveTopicTaxonomy({ status: "draft", taxonomy: emptyTaxonomy, forceNew: true });
    await saveSiteStructure({ status: "draft", structure: emptyStructure, forceNew: true });
    setActionMessage("Intake reset from profile. Start fresh.");
    setActiveStep("profile");
    await loadIntakeState();
  };

  const resetFromTaxonomy = async () => {
    setShowHistoryPanel(false);
    setTaxonomyDraft(emptyTaxonomy);
    setDraftStructure(emptyStructure);
    await saveTopicTaxonomy({ status: "draft", taxonomy: emptyTaxonomy, forceNew: true });
    await saveSiteStructure({ status: "draft", structure: emptyStructure, forceNew: true });
    setActionMessage("Taxonomy reset. Rebuild tags and structure.");
    setActiveStep("taxonomy");
    await loadIntakeState();
  };

  const resetFromStructure = async () => {
    setShowHistoryPanel(false);
    setDraftStructure(emptyStructure);
    setTaxonomyDraft(emptyTaxonomy);
    await saveSiteStructure({
      status: "draft",
      structure: emptyStructure,
      forceNew: true,
    });
    await saveTopicTaxonomy({
      status: "draft",
      taxonomy: emptyTaxonomy,
      forceNew: true,
    });
    setActionMessage("Structure reset. Update pages and regenerate taxonomy.");
    setActiveStep("structure");
    await loadIntakeState();
  };

  const restoreProfileVersion = async (version: BusinessProfileRecord) => {
    const profile = normalizeProfile(version.profile_data);
    setServices(profile.services.join(", "));
    setSubjects(profile.subjects.join(", "));
    setLocation(profile.location ?? "");
    setPricingNotes(profile.pricing_notes ?? "");
    setTargetAudience(profile.target_audience ?? "");
    setBrandVoice(profile.brand_voice ?? "");
    setNotes(profile.notes ?? "");
    setDeliveryMethods(new Set(profile.delivery_methods));
    setPricingModels(new Set(profile.pricing_models));
    setActionMessage("Profile version loaded. Saving as draft...");
    await saveBusinessProfile({ status: "draft", profile, forceNew: true });
    setActiveStep("profile");
    await loadIntakeState();
  };

  const restoreTaxonomyVersion = async (version: TopicTaxonomyRecord) => {
    const taxonomy = version.taxonomy_data ?? emptyTaxonomy;
    setTaxonomyDraft(taxonomy);
    await saveTopicTaxonomy({ status: "draft", taxonomy, forceNew: true });
    setActiveStep("taxonomy");
    await loadIntakeState();
  };

  const loadTaxonomyLog = async () => {
    setTaxonomyLogLoading(true);
    setActionError(null);
    try {
      const response = await apiFetch(
        `${apiBaseUrl}/api/v1/site/taxonomy/history?limit=40`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as TopicTaxonomyChange[];
      setTaxonomyLog(data);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setTaxonomyLogLoading(false);
    }
  };

  const restoreTaxonomyChange = async (
    change: TopicTaxonomyChange,
    status: "draft" | "approved"
  ) => {
    if (!change.taxonomy_data) return;
    setTaxonomyRestoreId(change.id);
    setActionError(null);
    try {
      const commitClassification =
        status === "approved" ? "approval_required" : "safe_auto_commit";
      const data = (await executeTool("canonical.topic_taxonomy.restore", {
        change_id: change.id,
        status,
        force_new: true,
        commit_classification: commitClassification,
      })) as unknown as TopicTaxonomyRecord;
      const restored = change.taxonomy_data;
      setTaxonomyDraft(restored);
      lastSavedTaxonomyRef.current = JSON.stringify(restored);
      setIntakeState((prev) =>
        prev
          ? {
              ...prev,
              topic_taxonomy: data,
              topic_taxonomy_history: prev.topic_taxonomy_history,
            }
          : {
              business_profile: null,
              site_structure: null,
              topic_taxonomy: data,
              business_profile_history: [],
              site_structure_history: [],
              topic_taxonomy_history: [],
            }
      );
      setActionMessage("Taxonomy restored. Review and approve if needed.");
      setActiveStep(status === "approved" ? "review" : "taxonomy");
      setShowTaxonomyLog(false);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setTaxonomyRestoreId(null);
    }
  };

  const parseOptionalJson = (value: string): Record<string, unknown> | unknown[] | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as Record<string, unknown> | unknown[];
  };

  const formatJson = (value: Record<string, unknown> | unknown[] | null) => {
    if (!value) return "{\n\n}";
    try {
      return `${JSON.stringify(value, null, 2)}\n`;
    } catch {
      return "{\n\n}";
    }
  };

  const loadPageConfigHistory = async (pageId: string) => {
    if (!pageId) return;
    setPageConfigHistoryLoading(true);
    setActionError(null);
    try {
      const params = new URLSearchParams();
      params.set("page_id", pageId);
      if (intakeState?.site_structure?.id) {
        params.set("site_structure_version_id", `${intakeState.site_structure.id}`);
      }
      params.set("limit", "10");
      const response = await apiFetch(
        `${apiBaseUrl}/api/v1/site/page-config/history?${params.toString()}`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as PageConfigVersion[];
      setPageConfigHistory(data);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setPageConfigHistoryLoading(false);
    }
  };

  const savePageConfigVersion = async () => {
    if (!pageConfigPageId) {
      setActionError("Select a page before saving.");
      return;
    }
    setPageConfigLoading(true);
    setActionError(null);
    try {
      const configData = parseOptionalJson(pageConfigData);
      const selectionRules = parseOptionalJson(pageConfigRules);
      const commitClassification =
        pageConfigStatus === "approved" ? "approval_required" : "safe_auto_commit";
      const proposal = {
        page_id: pageConfigPageId,
        site_structure_version_id: intakeState?.site_structure?.id ?? null,
        config_data: configData,
        selection_rules: selectionRules,
        status: pageConfigStatus,
        commit_classification: commitClassification,
      };
      await executeTool("canonical.page_config.create", proposal);
      setActionMessage("Page config saved.");
      await loadPageConfigHistory(pageConfigPageId);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setPageConfigLoading(false);
    }
  };

  const openPageConfigPanel = async () => {
    const pageId =
      pageConfigPageId ||
      draftStructure.pages[0]?.id ||
      intakeState?.site_structure?.structure_data?.pages?.[0]?.id ||
      "";
    setPageConfigPageId(pageId);
    setShowPageConfigPanel(true);
    setShowHistoryPanel(false);
    setShowTaxonomyLog(false);
    setShowSettingsPanel(false);
    setMenuOpen(false);
    if (pageId) {
      await loadPageConfigHistory(pageId);
    }
  };

  const loadPageConfigEntry = (entry: PageConfigVersion) => {
    setPageConfigPageId(entry.page_id);
    setPageConfigStatus(entry.status === "approved" ? "approved" : "draft");
    setPageConfigData(formatJson(entry.config_data));
    setPageConfigRules(formatJson(entry.selection_rules));
  };

  const restoreStructureVersion = async (version: SiteStructureRecord) => {
    const structure = version.structure_data ?? emptyStructure;
    setDraftStructure(structure);
    await saveSiteStructure({ status: "draft", structure, forceNew: true });
    setActiveStep("structure");
    await loadIntakeState();
  };

  const slugify = (value: string) => {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .trim();
    const slug = cleaned.replace(/\s+/g, "-");
    return slug || "page";
  };

  const applyDefaultDescription = () => {
    if (!newPageTitle.trim()) return;
    setNewPageDescription(`Overview of ${newPageTitle.trim()}.`);
  };

  const handleAddPage = () => {
    if (!newPageTitle.trim()) return;
    const slug = slugify(newPageTitle.trim());
    const existingSlugs = new Set(draftStructure.pages.map((page) => page.slug));
    let uniqueSlug = slug;
    let counter = 2;
    while (existingSlugs.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter += 1;
    }
    const parentId = newPageParent ?? null;
    const siblingOrders = draftStructure.pages
      .filter((page) => page.parent_id === parentId)
      .map((page) => page.order);
    const nextOrder = siblingOrders.length
      ? Math.max(...siblingOrders) + 1
      : 0;
    const newPage: SitePage = {
      id: uniqueSlug,
      title: newPageTitle.trim(),
      slug: uniqueSlug,
      description:
        newPageDescription.trim() || `Overview of ${newPageTitle.trim()}.`,
      parent_id: parentId,
      order: nextOrder,
      status: "draft",
      template_id: null,
      service_type: null,
    };
    setDraftStructure((prev) => ({ ...prev, pages: [...prev.pages, newPage] }));
    setNewPageTitle("");
    setNewPageDescription("");
  };

  const handleRemovePage = (pageId: string) => {
    setDraftStructure({
      ...draftStructure,
      pages: draftStructure.pages.filter((page) => page.id !== pageId),
    });
  };

  const handleUpdatePage = (
    pageId: string,
    updates: Partial<Pick<SitePage, "title" | "description">>
  ) => {
    setDraftStructure({
      ...draftStructure,
      pages: draftStructure.pages.map((page) =>
        page.id === pageId ? { ...page, ...updates } : page
      ),
    });
  };

  const handleStructureChangeRequest = async () => {
    const request = structureChangeRequest.trim();
    if (!request) return;
    setStructureChangeLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await apiFetch(
        `${apiBaseUrl}/api/v1/site/structure/change-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            change_request: request,
            structure: draftStructure,
          }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        structure: SiteStructure;
        summary: string[];
      };
      setDraftStructure(data.structure);
      setStructureChangeSummary(data.summary);
      setActionMessage("Change request applied. Review the updated structure.");
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setStructureChangeLoading(false);
    }
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const statusBadgeClass = (status: string) => {
    if (status === "approved" || status === "ready") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "draft") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  };

  const statusDotClass = (status: string) => {
    if (status === "approved" || status === "ready") {
      return "bg-emerald-500";
    }
    if (status === "draft") {
      return "bg-amber-500";
    }
    return "bg-zinc-300";
  };

  const statusHelp = (status: string) => {
    if (status === "approved") {
      return "Approved and locked in.";
    }
    if (status === "ready") {
      return "Ready for the next step.";
    }
    if (status === "draft") {
      return "Draft in progress.";
    }
    return "Not started yet.";
  };

  const isProfileEmpty = (profile: BusinessProfile) =>
    !profile.services.length &&
    !profile.subjects.length &&
    !profile.delivery_methods.length &&
    !profile.pricing_models.length &&
    !profile.pricing_notes &&
    !profile.location &&
    !profile.target_audience &&
    !profile.brand_voice &&
    !profile.notes;

  const isProfileSame = (profile: BusinessProfile) =>
    JSON.stringify(profile) === profilePayloadKey;

  const isTaxonomyEmpty = (taxonomy: TopicTaxonomy) => !taxonomy.tags.length;

  const isTaxonomySame = (taxonomy: TopicTaxonomy) =>
    JSON.stringify(taxonomy) === taxonomyPayloadKey;

  const isStructureEmpty = (structure: SiteStructure) => !structure.pages.length;

  const isStructureSame = (structure: SiteStructure) =>
    JSON.stringify(structure) === structurePayloadKey;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Site Intake</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Intake flows auto-save. Changes here update staging only; production is
            unchanged until you publish.
          </p>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300"
            aria-label="Intake menu"
            aria-expanded={menuOpen}
          >
            ...
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-10 mt-2 w-52 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
              <button
                type="button"
                onClick={() => void handleReloadSaved()}
                disabled={stateLoading}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed"
              >
                {stateLoading ? "Reloading..." : "Reload saved intake"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHistoryPanel((prev) => !prev);
                  setShowTaxonomyLog(false);
                  setShowPageConfigPanel(false);
                  setMenuOpen(false);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
              >
                {showHistoryPanel ? "Hide version history" : "Show version history"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !showTaxonomyLog;
                  setShowTaxonomyLog(next);
                  setShowHistoryPanel(false);
                  setShowPageConfigPanel(false);
                  setMenuOpen(false);
                  if (next) {
                    void loadTaxonomyLog();
                  }
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
              >
                {showTaxonomyLog ? "Hide taxonomy history" : "Taxonomy history"}
              </button>
              <button
                type="button"
                onClick={() => void openPageConfigPanel()}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
              >
                Page config
              </button>
              <button
                type="button"
                onClick={() => void resetFromProfile()}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
              >
                Reset intake
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
              {[
                { key: "profile", label: "Profile", status: profileStatus },
                { key: "structure", label: "Structure", status: structureStatus },
                { key: "taxonomy", label: "Taxonomy", status: taxonomyStatus },
                {
                  key: "review",
                  label: "Site Review",
                  status: intakeComplete ? "ready" : "empty",
                },
              ].map((step, index, steps) => {
                const isLocked = intakeComplete && step.key === "profile";
                const prerequisitesMet =
                  step.key === "profile"
                    ? true
                    : step.key === "structure"
                    ? profileApproved
                    : step.key === "taxonomy"
                    ? profileApproved && structureApproved
                    : intakeComplete;
                const isDisabled = isLocked || !prerequisitesMet;
                const disabledTitle = isLocked
                  ? "Profile is locked after site review. Reset intake to start over."
                  : "Complete the previous step to continue.";
                const helpText = `${STATUS_LABELS[step.status] ?? "Not started"}: ${statusHelp(
                  step.status
                )}`;
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDisabled) {
                          setActionMessage(disabledTitle);
                          return;
                        }
                        setActiveStep(step.key as IntakeStep);
                      }}
                      disabled={isDisabled}
                      title={isDisabled ? disabledTitle : undefined}
                      className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-300"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${statusDotClass(
                          step.status
                        )}`}
                        title={helpText}
                      />
                      <span>{step.label}</span>
                    </button>
                    {index < steps.length - 1 ? (
                      <span className="text-zinc-300">&gt;&gt;</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-zinc-400">
              {savingProfile || savingTaxonomy || savingStructure
                ? "Saving..."
                : lastSavedAt
                ? `Last saved ${formatTimestamp(lastSavedAt)}`
                : "Autosave active"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/photos")}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Manage site images
            </button>
          </div>
        </div>
      </section>

      {showHistoryPanel ? (
        <div className="fixed inset-0 z-20">
          <button
            type="button"
            aria-label="Close saved versions"
            onClick={() => setShowHistoryPanel(false)}
            className="absolute inset-0 cursor-default bg-black/20"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Saved versions
                </h3>
                <p className="text-xs text-zinc-500">
                  Pick a version to load into the current step.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryPanel(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 transition hover:border-zinc-300"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Profile
                </h4>
                {intakeState?.business_profile_history?.length ? (
                  <div className="space-y-2">
                    {intakeState.business_profile_history.map((item) => {
                      const profileData = normalizeProfile(item.profile_data);
                      const isEmpty = isProfileEmpty(profileData);
                      const isSame = isProfileSame(profileData);
                      const disabled = isEmpty || isSame;
                      const reason = isEmpty
                        ? "Empty"
                        : isSame
                        ? "No changes"
                        : null;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-zinc-700">
                            {item.status} • {formatTimestamp(item.created_at)}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {profileData.services.join(", ") || "No services"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {reason ? (
                              <span className="text-[11px] text-zinc-400">
                                {reason}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void restoreProfileVersion(item)}
                              disabled={disabled}
                              className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No profile history.</p>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Taxonomy
                </h4>
                {intakeState?.topic_taxonomy_history?.length ? (
                  <div className="space-y-2">
                    {intakeState.topic_taxonomy_history.map((item) => {
                      const taxonomyData = item.taxonomy_data ?? emptyTaxonomy;
                      const isEmpty = isTaxonomyEmpty(taxonomyData);
                      const isSame = isTaxonomySame(taxonomyData);
                      const disabled = isEmpty || isSame;
                      const reason = isEmpty
                        ? "Empty"
                        : isSame
                        ? "No changes"
                        : null;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-zinc-700">
                            {item.status} • {formatTimestamp(item.created_at)}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {taxonomyData.tags.length} tags
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {reason ? (
                              <span className="text-[11px] text-zinc-400">
                                {reason}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void restoreTaxonomyVersion(item)}
                              disabled={disabled}
                              className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No taxonomy history.</p>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Structure
                </h4>
                {intakeState?.site_structure_history?.length ? (
                  <div className="space-y-2">
                    {intakeState.site_structure_history.map((item) => {
                      const structureData = item.structure_data ?? emptyStructure;
                      const isEmpty = isStructureEmpty(structureData);
                      const isSame = isStructureSame(structureData);
                      const disabled = isEmpty || isSame;
                      const reason = isEmpty
                        ? "Empty"
                        : isSame
                        ? "No changes"
                        : null;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-zinc-700">
                            {item.status} • {formatTimestamp(item.created_at)}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {structureData.pages.length} pages
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {reason ? (
                              <span className="text-[11px] text-zinc-400">
                                {reason}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void restoreStructureVersion(item)}
                              disabled={disabled}
                              className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No structure history.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {showTaxonomyLog ? (
        <div className="fixed inset-0 z-20">
          <button
            type="button"
            aria-label="Close taxonomy history"
            onClick={() => setShowTaxonomyLog(false)}
            className="absolute inset-0 cursor-default bg-black/20"
          />
          <aside className="absolute right-6 top-24 w-full max-w-[360px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Taxonomy history
                </h3>
                <p className="text-xs text-zinc-500">
                  Restore a previous taxonomy snapshot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaxonomyLog(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 transition hover:border-zinc-300"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {taxonomyLogLoading ? (
                <p className="text-xs text-zinc-500">Loading history...</p>
              ) : taxonomyLog.length ? (
                taxonomyLog.map((item) => {
                  const taxonomyData = item.taxonomy_data ?? emptyTaxonomy;
                  const isEmpty = isTaxonomyEmpty(taxonomyData);
                  const isSame = isTaxonomySame(taxonomyData);
                  const disabled =
                    isEmpty || isSame || taxonomyRestoreId === item.id;
                  const reason = isEmpty
                    ? "Empty"
                    : isSame
                    ? "No changes"
                    : null;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-zinc-700">
                        {item.change_type} • {item.status} •{" "}
                        {formatTimestamp(item.created_at)}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {taxonomyData.tags.length} tags
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {reason ? (
                          <span className="text-[11px] text-zinc-400">{reason}</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void restoreTaxonomyChange(item, "draft")}
                          disabled={disabled}
                          className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Restore draft
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void restoreTaxonomyChange(item, "approved")
                          }
                          disabled={disabled}
                          className="rounded-full border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Restore approved
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500">No taxonomy history.</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {showPageConfigPanel ? (
        <div className="fixed inset-0 z-20">
          <button
            type="button"
            aria-label="Close page config"
            onClick={() => setShowPageConfigPanel(false)}
            className="absolute inset-0 cursor-default bg-black/20"
          />
          <aside className="absolute right-6 top-20 w-full max-w-[520px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Page config
                </h3>
                <p className="text-xs text-zinc-500">
                  Save a page config version and optional selection rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPageConfigPanel(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 transition hover:border-zinc-300"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Page
                  <select
                    value={pageConfigPageId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPageConfigPageId(value);
                      if (value) {
                        void loadPageConfigHistory(value);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-700"
                  >
                    <option value="">Select a page</option>
                    {draftStructure.pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Status
                  <select
                    value={pageConfigStatus}
                    onChange={(event) =>
                      setPageConfigStatus(
                        event.target.value === "approved" ? "approved" : "draft"
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-700"
                  >
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Config JSON
                <textarea
                  value={pageConfigData}
                  onChange={(event) => setPageConfigData(event.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-700"
                  placeholder={`{\n  "hero": {"asset_id": "..."}\n}`}
                />
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Selection rules JSON (optional)
                <textarea
                  value={pageConfigRules}
                  onChange={(event) => setPageConfigRules(event.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-700"
                  placeholder={`{\n  "slots": []\n}`}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void savePageConfigVersion()}
                  disabled={pageConfigLoading}
                  className="rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pageConfigLoading ? "Saving..." : "Save page config"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageConfigData("{\n\n}");
                    setPageConfigRules("{\n\n}");
                  }}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Recent configs
                  </h4>
                  <button
                    type="button"
                    onClick={() => void loadPageConfigHistory(pageConfigPageId)}
                    disabled={!pageConfigPageId || pageConfigHistoryLoading}
                    className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-700 disabled:cursor-not-allowed"
                  >
                    {pageConfigHistoryLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>
                {pageConfigHistory.length ? (
                  <div className="space-y-2">
                    {pageConfigHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-zinc-700">
                          {entry.status} • {formatTimestamp(entry.created_at)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {entry.selection_rules ? "rules" : "no rules"} • snapshot{" "}
                          {entry.taxonomy_snapshot_id ?? "none"}
                        </p>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => loadPageConfigEntry(entry)}
                            className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300"
                          >
                            Load into editor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No page configs yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={freeformInput}
              onChange={(event) => setFreeformInput(event.target.value)}
              placeholder="Ask in plain language..."
              className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleFreeformSubmit}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Submit
            </button>
          </div>
          {guardrailMessage ? (
            <p className="text-xs text-amber-700">{guardrailMessage}</p>
          ) : null}
        </div>
      </section>

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          {actionMessage}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {actionError}
        </div>
      ) : null}

      {activeStep === "profile" ? (
        <section className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">
                Business profile
              </h3>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${statusBadgeClass(
                  profileStatus
                )}`}
              >
                {STATUS_LABELS[profileStatus]}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Services (comma separated)
              </label>
              <input
                value={services}
                onChange={(event) => setServices(event.target.value)}
                placeholder="Family portraits, senior sessions"
                className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Subjects (comma separated)
              </label>
              <input
                value={subjects}
                onChange={(event) => setSubjects(event.target.value)}
                placeholder="Families, couples, graduates"
                className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Delivery methods
              </label>
              <div className="flex flex-wrap gap-3">
                {DELIVERY_METHODS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 text-xs text-zinc-600"
                  >
                    <input
                      type="checkbox"
                      checked={deliveryMethods.has(option.key)}
                      onChange={() =>
                        toggleSetValue(setDeliveryMethods, option.key)
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Pricing models
              </label>
              <div className="flex flex-wrap gap-3">
                {PRICING_MODELS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 text-xs text-zinc-600"
                  >
                    <input
                      type="checkbox"
                      checked={pricingModels.has(option.key)}
                      onChange={() =>
                        toggleSetValue(setPricingModels, option.key)
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Pricing notes
              </label>
              <textarea
                value={pricingNotes}
                onChange={(event) => setPricingNotes(event.target.value)}
                placeholder="Session length, typical package ranges, add-ons..."
                className="min-h-[90px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Location
                </label>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Bend, OR"
                  className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Target audience
                </label>
                <input
                  value={targetAudience}
                  onChange={(event) => setTargetAudience(event.target.value)}
                  placeholder="Families, couples, seniors"
                  className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Brand voice
                </label>
                <input
                  value={brandVoice}
                  onChange={(event) => setBrandVoice(event.target.value)}
                  placeholder="Warm, candid, relaxed"
                  className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Notes
                </label>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Additional context for the site"
                  className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Structure change requests (optional)
              </label>
              <textarea
                value={changesRequested}
                onChange={(event) => setChangesRequested(event.target.value)}
                placeholder="add page: Pricing\nremove page: Blog"
                className="min-h-[80px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleApproveProfile()}
              disabled={proposing || savingProfile}
              className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed"
            >
              {proposing ? "Generating..." : "Approve profile and generate structure"}
            </button>
          </div>

          <details className="rounded-2xl border border-zinc-200 bg-white p-6">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
              Latest proposal
            </summary>
            <div className="mt-4 space-y-4">
              {!proposal ? (
                <p className="text-sm text-zinc-500">
                  Generate a proposal to see structure and tags.
                </p>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Structure preview
                    </h4>
                    <div className="mt-3 space-y-2 text-sm text-zinc-600">
                      {proposal.site_structure.pages.map((page) => (
                        <div
                          key={page.id}
                          className="rounded-xl border border-zinc-200 px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-zinc-800">
                            {page.title}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {page.description}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            /{page.slug}{" "}
                            {page.parent_id ? `• parent ${page.parent_id}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Tag preview
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {proposal.topic_taxonomy.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600"
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      JSON output
                    </h4>
                    <pre className="mt-3 max-h-64 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
                      {proposalJson}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </details>
        </section>
      ) : null}

      {activeStep === "taxonomy" ? (
        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-900">
                Topic taxonomy
              </h3>
              <p className="text-sm text-zinc-500">
                Generated from the approved structure. Adjust tags, then approve to
                enter site review.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${statusBadgeClass(
                  taxonomyStatus
                )}`}
              >
                {STATUS_LABELS[taxonomyStatus]}
              </span>
              <button
                type="button"
                onClick={() => void resetFromTaxonomy()}
                className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-rose-500 transition hover:border-rose-200 hover:text-rose-600"
              >
                Reset taxonomy
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {taxonomyDraft.tags.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600"
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="text-[11px] font-semibold text-red-500"
                >
                  Remove
                </button>
              </span>
            ))}
            {!taxonomyDraft.tags.length ? (
              <p className="text-sm text-zinc-500">
                No tags yet. Generate from profile or add tags below.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={newTagLabel}
              onChange={(event) => setNewTagLabel(event.target.value)}
              placeholder="Add a tag (e.g. families, newborns)"
              className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Add tag
            </button>
            <button
              type="button"
              onClick={() => void handleApproveTaxonomy()}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Approve taxonomy and continue
            </button>
          </div>

        </section>
      ) : null}

      {activeStep === "structure" ? (
        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-900">
                Site structure
              </h3>
              <p className="text-sm text-zinc-500">
                Adjust pages, then approve to generate the taxonomy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${statusBadgeClass(
                  structureStatus
                )}`}
              >
                {STATUS_LABELS[structureStatus]}
              </span>
              <button
                type="button"
                onClick={() => void resetFromStructure()}
                className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-rose-500 transition hover:border-rose-200 hover:text-rose-600"
              >
                Reset structure
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Structural change request
            </label>
            <textarea
              value={structureChangeRequest}
              onChange={(event) => setStructureChangeRequest(event.target.value)}
              placeholder='Organize service pages under the "Services" page.'
              className="min-h-[80px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleStructureChangeRequest()}
              disabled={structureChangeLoading}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed"
            >
              {structureChangeLoading ? "Applying..." : "Apply change request"}
            </button>
            {structureChangeSummary?.length ? (
              <ul className="space-y-1 text-xs text-zinc-600">
                {structureChangeSummary.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                New page title
              </label>
              <input
                value={newPageTitle}
                onChange={(event) => setNewPageTitle(event.target.value)}
                placeholder="Pricing"
                className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Parent page (optional)
              </label>
              <select
                value={newPageParent ?? ""}
                onChange={(event) => setNewPageParent(event.target.value || null)}
                className="w-full rounded-full border border-zinc-200 px-4 py-2 text-sm"
              >
                <option value="">No parent</option>
                {draftStructure.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={newPageDescription}
              onChange={(event) => setNewPageDescription(event.target.value)}
              placeholder="Overview of Pricing."
              className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm"
            />
            <button
              type="button"
              onClick={applyDefaultDescription}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Use default description
            </button>
            <button
              type="button"
              onClick={handleAddPage}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Add page
            </button>
          </div>

          <div className="space-y-3">
            {draftStructure.pages.map((page) => (
              <div
                key={page.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 space-y-2">
                    <input
                      value={page.title}
                      onChange={(event) =>
                        handleUpdatePage(page.id, {
                          title: event.target.value,
                        })
                      }
                      className="w-full rounded-full border border-zinc-200 px-3 py-1 text-sm"
                    />
                    <input
                      value={page.description}
                      onChange={(event) =>
                        handleUpdatePage(page.id, {
                          description: event.target.value,
                        })
                      }
                      className="w-full rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600"
                    />
                    <p className="text-[11px] text-zinc-400">
                      /{page.slug}{" "}
                      {page.parent_id ? `• parent ${page.parent_id}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePage(page.id)}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-900">
              Proposed structure JSON
            </h4>
            <pre className="max-h-64 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
              {JSON.stringify(draftStructure, null, 2)}
            </pre>
            <button
              type="button"
              onClick={() => void handleApproveStructure()}
              className="w-full rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Approve structure and generate taxonomy
            </button>
          </div>

        </section>
      ) : null}

      {activeStep === "review" ? (
        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900">Site review</h3>
            <p className="text-sm text-zinc-500">
              The intake steps are approved. Review individual pages next or
              adjust structure if needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveStep("structure")}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Modify site structure
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("taxonomy")}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Add tags
            </button>
            <button
              type="button"
              onClick={() => void resetFromProfile()}
              className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-rose-500 transition hover:border-rose-200 hover:text-rose-600"
            >
              Start intake over
            </button>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs text-zinc-600">
              Next: review individual pages in the site builder (Epic 2). Until
              then, staging reflects the latest approved structure.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
