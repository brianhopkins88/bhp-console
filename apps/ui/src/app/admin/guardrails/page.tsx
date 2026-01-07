"use client";

import { useEffect, useState } from "react";

type GuardrailScope = {
  agent?: string;
  task_type?: string;
  page_type?: string;
  content_block_type?: string;
};

type GuardrailRecord = {
  id: number;
  guardrail_id: string;
  version: number;
  title: string;
  statement: string;
  scope: GuardrailScope | null;
  status: string;
  created_at: string;
};

type PromptRecord = {
  id: number;
  agent_name: string;
  version: number;
  prompt_text: string;
  status: string;
  created_at: string;
};

type GuardrailSearchResult = {
  guardrail: GuardrailRecord;
  score: number;
};

type EvaluationRun = {
  id: number;
  agent_name: string | null;
  input_text: string;
  guardrail_query: string | null;
  prompt_version_id: number | null;
  output_text: string | null;
  metrics: Record<string, unknown> | null;
  created_at: string;
};

type EvaluationResponse = {
  evaluation: EvaluationRun;
  guardrails: GuardrailSearchResult[];
  prompt_text: string | null;
  model_output: string | null;
};

export default function GuardrailsPage() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
  const apiFetch: typeof fetch = (input, init) =>
    globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });

  const [guardrails, setGuardrails] = useState<GuardrailRecord[]>([]);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [guardrailTitle, setGuardrailTitle] = useState("");
  const [guardrailStatement, setGuardrailStatement] = useState("");
  const [guardrailStatus, setGuardrailStatus] = useState("active");
  const [guardrailAgent, setGuardrailAgent] = useState("");
  const [guardrailTaskType, setGuardrailTaskType] = useState("");
  const [guardrailPageType, setGuardrailPageType] = useState("");
  const [guardrailBlockType, setGuardrailBlockType] = useState("");

  const [promptAgent, setPromptAgent] = useState("");
  const [promptText, setPromptText] = useState("");
  const [promptStatus, setPromptStatus] = useState("active");

  const [evalAgent, setEvalAgent] = useState("");
  const [evalInput, setEvalInput] = useState("");
  const [evalQuery, setEvalQuery] = useState("");
  const [evalPromptVersionId, setEvalPromptVersionId] = useState("");
  const [evalTopK, setEvalTopK] = useState("5");
  const [evalRunModel, setEvalRunModel] = useState(false);
  const [evalModelName, setEvalModelName] = useState("");
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResponse | null>(null);

  const loadGuardrails = async () => {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/guardrails?limit=50`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail ?? `HTTP ${response.status}`);
    }
    const data = (await response.json()) as GuardrailRecord[];
    setGuardrails(data);
  };

  const loadPrompts = async () => {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/prompts?limit=50`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail ?? `HTTP ${response.status}`);
    }
    const data = (await response.json()) as PromptRecord[];
    setPrompts(data);
  };

  useEffect(() => {
    setLoading(true);
    setActionError(null);
    Promise.all([loadGuardrails(), loadPrompts()])
      .catch((err) => setActionError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const buildScope = (): GuardrailScope | null => {
    const scope: GuardrailScope = {};
    if (guardrailAgent.trim()) scope.agent = guardrailAgent.trim();
    if (guardrailTaskType.trim()) scope.task_type = guardrailTaskType.trim();
    if (guardrailPageType.trim()) scope.page_type = guardrailPageType.trim();
    if (guardrailBlockType.trim()) scope.content_block_type = guardrailBlockType.trim();
    return Object.keys(scope).length ? scope : null;
  };

  const handleCreateGuardrail = async () => {
    setActionMessage(null);
    setActionError(null);
    try {
      const payload = {
        title: guardrailTitle.trim(),
        statement: guardrailStatement.trim(),
        status: guardrailStatus,
        scope: buildScope(),
      };
      if (!payload.title || !payload.statement) {
        throw new Error("Title and statement are required.");
      }
      const response = await apiFetch(`${apiBaseUrl}/api/v1/guardrails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail ?? `HTTP ${response.status}`);
      }
      setGuardrailTitle("");
      setGuardrailStatement("");
      setGuardrailAgent("");
      setGuardrailTaskType("");
      setGuardrailPageType("");
      setGuardrailBlockType("");
      setActionMessage("Guardrail saved.");
      await loadGuardrails();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleCreatePrompt = async () => {
    setActionMessage(null);
    setActionError(null);
    try {
      const payload = {
        agent_name: promptAgent.trim(),
        prompt_text: promptText.trim(),
        status: promptStatus,
      };
      if (!payload.agent_name || !payload.prompt_text) {
        throw new Error("Agent name and prompt text are required.");
      }
      const response = await apiFetch(`${apiBaseUrl}/api/v1/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail ?? `HTTP ${response.status}`);
      }
      setPromptAgent("");
      setPromptText("");
      setActionMessage("Prompt saved.");
      await loadPrompts();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleRunEvaluation = async () => {
    setActionMessage(null);
    setActionError(null);
    setEvaluationResult(null);
    try {
      const payload = {
        agent_name: evalAgent.trim() || null,
        input_text: evalInput.trim(),
        guardrail_query: evalQuery.trim() || null,
        prompt_version_id: evalPromptVersionId ? Number(evalPromptVersionId) : null,
        top_k: Number(evalTopK) || 5,
        run_model: evalRunModel,
        model_name: evalModelName.trim() || null,
      };
      if (!payload.input_text) {
        throw new Error("Input text is required.");
      }
      const response = await apiFetch(`${apiBaseUrl}/api/v1/guardrails/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as EvaluationResponse;
      setEvaluationResult(data);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-900">Guardrails</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Manage prompt versions, guardrail statements, and run evaluation harnesses.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading guardrails and prompts…
        </div>
      ) : null}

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

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900">New guardrail</h3>
          <div className="space-y-3 text-sm">
            <input
              value={guardrailTitle}
              onChange={(event) => setGuardrailTitle(event.target.value)}
              placeholder="Title"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <textarea
              value={guardrailStatement}
              onChange={(event) => setGuardrailStatement(event.target.value)}
              placeholder="Guardrail statement"
              className="min-h-[120px] w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={guardrailAgent}
                onChange={(event) => setGuardrailAgent(event.target.value)}
                placeholder="Agent name (optional)"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
              <input
                value={guardrailTaskType}
                onChange={(event) => setGuardrailTaskType(event.target.value)}
                placeholder="Task type (optional)"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
              <input
                value={guardrailPageType}
                onChange={(event) => setGuardrailPageType(event.target.value)}
                placeholder="Page type (optional)"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
              <input
                value={guardrailBlockType}
                onChange={(event) => setGuardrailBlockType(event.target.value)}
                placeholder="Content block (optional)"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </div>
            <select
              value={guardrailStatus}
              onChange={(event) => setGuardrailStatus(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="button"
              onClick={handleCreateGuardrail}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Save guardrail
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900">Guardrail list</h3>
          {guardrails.length ? (
            <div className="space-y-3">
              {guardrails.map((guardrail) => (
                <div key={guardrail.id} className="rounded-xl border border-zinc-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {guardrail.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {guardrail.guardrail_id} v{guardrail.version} · {guardrail.status}
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      {guardrail.scope?.agent ?? "global"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">{guardrail.statement}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No guardrails yet.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900">New prompt</h3>
          <div className="space-y-3 text-sm">
            <input
              value={promptAgent}
              onChange={(event) => setPromptAgent(event.target.value)}
              placeholder="Agent name"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <textarea
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              placeholder="Prompt text"
              className="min-h-[140px] w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <select
              value={promptStatus}
              onChange={(event) => setPromptStatus(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="button"
              onClick={handleCreatePrompt}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Save prompt
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900">Prompt list</h3>
          {prompts.length ? (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <div key={prompt.id} className="rounded-xl border border-zinc-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {prompt.agent_name} v{prompt.version}
                      </p>
                      <p className="text-xs text-zinc-500">{prompt.status}</p>
                    </div>
                    <span className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      {prompt.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-zinc-600">
                    {prompt.prompt_text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No prompts yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-zinc-900">Evaluation harness</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <input
              value={evalAgent}
              onChange={(event) => setEvalAgent(event.target.value)}
              placeholder="Agent name (optional)"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <textarea
              value={evalInput}
              onChange={(event) => setEvalInput(event.target.value)}
              placeholder="Input context"
              className="min-h-[140px] w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <input
              value={evalQuery}
              onChange={(event) => setEvalQuery(event.target.value)}
              placeholder="Guardrail search query (optional)"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={evalPromptVersionId}
                onChange={(event) => setEvalPromptVersionId(event.target.value)}
                placeholder="Prompt version id (optional)"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
              <input
                value={evalTopK}
                onChange={(event) => setEvalTopK(event.target.value)}
                placeholder="Top K"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </div>
            <div className="flex flex-col gap-2 text-xs text-zinc-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={evalRunModel}
                  onChange={(event) => setEvalRunModel(event.target.checked)}
                />
                Run model if API key is set
              </label>
              {evalRunModel ? (
                <input
                  value={evalModelName}
                  onChange={(event) => setEvalModelName(event.target.value)}
                  placeholder="Model override (optional)"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleRunEvaluation}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Run evaluation
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {evaluationResult ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-100 p-3 text-xs text-zinc-600">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Prompt preview
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-700">
                    {evaluationResult.prompt_text}
                  </pre>
                </div>
                <div className="rounded-xl border border-zinc-100 p-3 text-xs text-zinc-600">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Retrieved guardrails
                  </p>
                  {evaluationResult.guardrails.length ? (
                    <ul className="mt-2 space-y-2">
                      {evaluationResult.guardrails.map((result) => (
                        <li key={result.guardrail.id}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-800">
                              {result.guardrail.title}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {result.score.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600">
                            {result.guardrail.statement}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">No guardrails retrieved.</p>
                  )}
                </div>
                {evaluationResult.model_output ? (
                  <div className="rounded-xl border border-zinc-100 p-3 text-xs text-zinc-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Model output
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-700">
                      {evaluationResult.model_output}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Run an evaluation to see retrieved guardrails and prompt preview.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
