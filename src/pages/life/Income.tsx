import { useMemo, useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { Trash2, Target, Pencil, TrendingUp, TrendingDown, X, Plus } from "lucide-react";

function YearGoalCard() {
  const incomeGoal = useAppStore((s) => s.profile.incomeGoal);
  const setIncomeGoal = useAppStore((s) => s.setIncomeGoal);
  const [editing, setEditing] = useState(false);
  const [minDraft, setMinDraft] = useState(String(incomeGoal.min));
  const [maxDraft, setMaxDraft] = useState(String(incomeGoal.max));
  const [dateDraft, setDateDraft] = useState(incomeGoal.targetDate);

  const daysLeft = Math.max(0, Math.round((new Date(incomeGoal.targetDate).getTime() - Date.now()) / 86400000));

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target size={13} color="var(--color-ember)" />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
            Monthly goal, by year end
          </p>
        </div>
        <button onClick={() => setEditing((v) => !v)} aria-label="Edit goal">
          <Pencil size={13} color="var(--color-ink-faint)" />
        </button>
      </div>

      {!editing ? (
        <>
          <p className="mt-2 font-mono text-2xl font-bold">
            {incomeGoal.min.toLocaleString()}–{incomeGoal.max.toLocaleString()}{" "}
            <span className="text-base font-normal" style={{ color: "var(--color-ink-dim)" }}>{incomeGoal.currency}</span>
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
            {daysLeft} days left · this is the range your daily quests and monthly tracking are both pointed at.
          </p>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              placeholder="Min"
              className="w-1/2 rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
            <input
              type="number"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              placeholder="Max"
              className="w-1/2 rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
          </div>
          <input
            type="date"
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <GhostButton
            className="text-xs"
            onClick={() => {
              const min = Number(minDraft);
              const max = Number(maxDraft);
              if (!min || !max || min <= 0 || max <= 0 || max < min || !dateDraft) return;
              setIncomeGoal({ min, max, currency: "KES", targetDate: dateDraft });
              setEditing(false);
            }}
          >
            Save goal
          </GhostButton>
        </div>
      )}
    </Card>
  );
}

export default function Income() {
  const income = useAppStore((s) => s.profile.income);
  const expenses = useAppStore((s) => s.profile.expenses);
  const budgetCategories = useAppStore((s) => s.profile.budgetCategories);
  const incomeGoal = useAppStore((s) => s.profile.incomeGoal);
  const ventures = useAppStore((s) => s.profile.ventures);
  const addVenture = useAppStore((s) => s.addVenture);
  const removeVenture = useAppStore((s) => s.removeVenture);
  const addIncomeEntry = useAppStore((s) => s.addIncomeEntry);
  const removeIncomeEntry = useAppStore((s) => s.removeIncomeEntry);
  const addExpenseEntry = useAppStore((s) => s.addExpenseEntry);
  const removeExpenseEntry = useAppStore((s) => s.removeExpenseEntry);
  const setBudgetCategory = useAppStore((s) => s.setBudgetCategory);

  const [mode, setMode] = useState<"income" | "expenses">("income");
  const [venture, setVenture] = useState(ventures[0] ?? "Other");
  const [addingVenture, setAddingVenture] = useState(false);
  const [ventureDraft, setVentureDraft] = useState("");
  const [expenseCategory, setExpenseCategory] = useState(budgetCategories[0]?.name ?? "Personal");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editingCap, setEditingCap] = useState<string | null>(null);
  const [capDraft, setCapDraft] = useState("");

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthIncome = useMemo(
    () => income.filter((e) => e.date.slice(0, 7) === currentMonth).reduce((sum, e) => sum + e.amountKES, 0),
    [income, currentMonth]
  );
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.slice(0, 7) === currentMonth).reduce((sum, e) => sum + e.amountKES, 0),
    [expenses, currentMonth]
  );
  const netThisMonth = monthIncome - monthExpenses;
  const pct = Math.min(100, Math.round((monthIncome / incomeGoal.min) * 100));

  const byVenture = useMemo(() => {
    const totals: Record<string, number> = {};
    income.filter((e) => e.date.slice(0, 7) === currentMonth).forEach((e) => {
      totals[e.venture] = (totals[e.venture] ?? 0) + e.amountKES;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [income, currentMonth]);

  const expensesByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.filter((e) => e.date.slice(0, 7) === currentMonth).forEach((e) => {
      totals[e.category] = (totals[e.category] ?? 0) + e.amountKES;
    });
    return totals;
  }, [expenses, currentMonth]);

  function submitIncome() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    addIncomeEntry(venture, amt, note || undefined);
    setAmount("");
    setNote("");
  }

  function submitExpense() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    addExpenseEntry(expenseCategory, amt, note || undefined);
    setAmount("");
    setNote("");
  }

  return (
    <div>
      <YearGoalCard />

      <Card className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          This month
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <p className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-good)" }}>
              <TrendingUp size={10} /> INCOME
            </p>
            <p className="font-mono text-lg font-bold">{monthIncome.toLocaleString()}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-bad)" }}>
              <TrendingDown size={10} /> EXPENSES
            </p>
            <p className="font-mono text-lg font-bold">{monthExpenses.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--color-ink-dim)" }}>NET</p>
            <p className="font-mono text-lg font-bold" style={{ color: netThisMonth >= 0 ? "var(--color-good)" : "var(--color-bad)" }}>
              {netThisMonth.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-3 h-2.5 w-full rounded-full" style={{ background: "var(--color-line)" }}>
          <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: "var(--color-ember)" }} />
        </div>
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          {monthIncome >= incomeGoal.min
            ? monthIncome >= incomeGoal.max
              ? "You've hit the top of your income range this month."
              : "You've cleared the floor of your income range."
            : `${(incomeGoal.min - monthIncome).toLocaleString()} KES to the floor of your range`}
        </p>

        {byVenture.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
            {byVenture.map(([v, total]) => (
              <div key={v} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-ink-dim)" }}>{v}</span>
                <span className="font-mono">{total.toLocaleString()} KES</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Budget categories
      </p>
      <Card>
        <div className="space-y-4">
          {budgetCategories.map((cat) => {
            const spent = expensesByCategory[cat.name] ?? 0;
            const capPct = Math.min(100, Math.round((spent / cat.capKES) * 100));
            const over = spent > cat.capKES;
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--color-ink)" }}>{cat.name}</span>
                  {editingCap === cat.name ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={capDraft}
                        onChange={(e) => setCapDraft(e.target.value)}
                        className="w-20 rounded-lg border px-2 py-1 text-xs outline-none"
                        style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                      />
                      <button
                        onClick={() => {
                          const cap = Number(capDraft);
                          if (cap > 0) setBudgetCategory(cat.name, cap);
                          setEditingCap(null);
                        }}
                        className="text-[10px] font-semibold"
                        style={{ color: "var(--color-ember)" }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCap(cat.name);
                        setCapDraft(String(cat.capKES));
                      }}
                      className="font-mono"
                      style={{ color: over ? "var(--color-bad)" : "var(--color-ink-dim)" }}
                    >
                      {spent.toLocaleString()} / {cat.capKES.toLocaleString()}
                    </button>
                  )}
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full" style={{ background: "var(--color-line)" }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${capPct}%`, background: over ? "var(--color-bad)" : "var(--color-ember)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setMode("income")}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: mode === "income" ? "var(--color-ember)" : "var(--color-surface)", color: mode === "income" ? "#fbf3e7" : "var(--color-ink-dim)" }}
        >
          Log income
        </button>
        <button
          onClick={() => setMode("expenses")}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: mode === "expenses" ? "var(--color-ember)" : "var(--color-surface)", color: mode === "expenses" ? "#fbf3e7" : "var(--color-ink-dim)" }}
        >
          Log expense
        </button>
      </div>

      {mode === "income" ? (
        <Card className="mt-3">
          <div className="flex flex-wrap gap-2">
            {ventures.map((v) => (
              <div key={v} className="group relative">
                <button
                  onClick={() => setVenture(v)}
                  className="rounded-lg border px-3 py-1.5 pr-6 text-xs"
                  style={{
                    borderColor: venture === v ? "var(--color-ember)" : "var(--color-line)",
                    background: venture === v ? "var(--color-ember-soft)" : "var(--color-surface-raised)",
                    color: venture === v ? "var(--color-ember)" : "var(--color-ink-dim)",
                  }}
                >
                  {v}
                </button>
                <button
                  onClick={() => {
                    removeVenture(v);
                    if (venture === v) setVenture(ventures.find((x) => x !== v) ?? "Other");
                  }}
                  aria-label={`Remove ${v}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                >
                  <X size={11} color="var(--color-ink-faint)" />
                </button>
              </div>
            ))}
            {addingVenture ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={ventureDraft}
                  onChange={(e) => setVentureDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && ventureDraft.trim()) {
                      addVenture(ventureDraft.trim());
                      setVenture(ventureDraft.trim());
                      setVentureDraft("");
                      setAddingVenture(false);
                    }
                    if (e.key === "Escape") {
                      setVentureDraft("");
                      setAddingVenture(false);
                    }
                  }}
                  placeholder="New venture name"
                  className="rounded-lg border px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: "var(--color-ember)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingVenture(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
              >
                <Plus size={12} /> Add
              </button>
            )}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in KES"
            className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <div className="mt-3">
            <PrimaryButton onClick={submitIncome} disabled={!amount || Number(amount) <= 0}>Log it</PrimaryButton>
          </div>
        </Card>
      ) : (
        <Card className="mt-3">
          <div className="flex flex-wrap gap-2">
            {budgetCategories.map((c) => (
              <button
                key={c.name}
                onClick={() => setExpenseCategory(c.name)}
                className="rounded-lg border px-3 py-1.5 text-xs"
                style={{
                  borderColor: expenseCategory === c.name ? "var(--color-ember)" : "var(--color-line)",
                  background: expenseCategory === c.name ? "var(--color-ember-soft)" : "var(--color-surface-raised)",
                  color: expenseCategory === c.name ? "var(--color-ember)" : "var(--color-ink-dim)",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in KES"
            className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <div className="mt-3">
            <PrimaryButton onClick={submitExpense} disabled={!amount || Number(amount) <= 0}>Log it</PrimaryButton>
          </div>
        </Card>
      )}

      {(mode === "income" ? income : expenses).length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Recent {mode}
          </p>
          <div className="space-y-2">
            {(mode === "income" ? income : expenses).slice(0, 15).map((e) => (
              <Card key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{"venture" in e ? e.venture : e.category}</p>
                  <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    {e.date} {e.note ? `· ${e.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm" style={{ color: mode === "income" ? "var(--color-good)" : "var(--color-bad)" }}>
                    {mode === "income" ? "+" : "-"}{e.amountKES.toLocaleString()}
                  </span>
                  <button onClick={() => (mode === "income" ? removeIncomeEntry(e.id) : removeExpenseEntry(e.id))} aria-label="Delete entry">
                    <Trash2 size={14} color="var(--color-ink-faint)" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
