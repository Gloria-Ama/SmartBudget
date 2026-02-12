"use client"
import { useEffect, useState } from "react";
import api from "./api";
import toast from "react-hot-toast";
import { Activity, ArrowDownCircle, ArrowUpCircle, PlusCircle, Trash, TrendingDown, TrendingUp, Wallet } from "lucide-react"

type Transaction = {
  id: string;
  text: string;
  amount: number;
  created_at: string
}

type MonthlyPlanItem = {
  id: string;
  category: string;
  amount: number;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [text, setText] = useState<string>("");
  const [amount, setAmount] = useState<number | "">("");
  const [type, setType] = useState<"income" | "expense">("income")
  const [loading, setLoading] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlanItem[]>([
    { id: "loyer", category: "Loyer", amount: 0 },
    { id: "courses", category: "Courses", amount: 0 },
    { id: "forfaits", category: "Forfaits", amount: 0 },
    { id: "transports", category: "Transports", amount: 0 },
    { id: "loisirs", category: "Loisirs", amount: 0 },
    { id: "epargne", category: "Épargne", amount: 0 },
  ]);

  // --- Transactions API ---
  const getTransactions = async () => {
    try {
      const res = await api.get<Transaction[]>("transactions/")
      setTransactions(res.data)
    } catch (error) {
      console.error("Erreur chargement transactions", error);
      toast.error("Erreur chargement transactions")
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      await api.delete(`transactions/${id}/`)
      getTransactions()
      toast.success("Transaction supprimée avec succès")
    } catch (error) {
      console.error("Erreur suppression transaction", error);
      toast.error("Erreur suppression transaction")
    }
  }

  const addTransaction = async () => {
    if (!text || amount === "" || isNaN(Number(amount))) {
      toast.error("Merci de remplir texte et montant valides")
      return
    }
    setLoading(true)
    try {
      const realAmount = type === "expense" ? -Math.abs(Number(amount)) : Number(amount);
      await api.post<Transaction>(`transactions/`, { text, amount: realAmount })
      getTransactions()
      document.getElementById('add_modal')?.close()
      toast.success("Transaction ajoutée avec succès")
      setText("")
      setAmount("")
      setType("income")
    } catch (error) {
      console.error("Erreur ajout transaction", error);
      toast.error("Erreur ajout transaction")
    } finally {
      setLoading(false)
    }
  }

  const updateTransaction = async () => {
    if (!editingTransaction) return
    if (!text || amount === "" || isNaN(Number(amount))) {
      toast.error("Merci de remplir texte et montant valides")
      return
    }
    setLoading(true)
    try {
      const realAmount = type === "expense" ? -Math.abs(Number(amount)) : Number(amount);
      await api.put(`transactions/${editingTransaction.id}/`, { text, amount: realAmount })
      getTransactions()
      document.getElementById('edit_modal')?.close()
      toast.success("Transaction modifiée avec succès")
      setEditingTransaction(null)
      setText("")
      setAmount("")
      setType("income")
    } catch (error) {
      console.error("Erreur modification transaction", error);
      toast.error("Erreur modification transaction")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { getTransactions() }, [])

  // --- Calculs Transactions ---
  const amounts = transactions.map((t) => Number(t.amount) || 0)
  const balance = amounts.reduce((acc, item) => acc + item, 0) || 0
  const income = amounts.filter(a => a > 0).reduce((acc, item) => acc + item, 0) || 0
  const expense = amounts.filter(a => a < 0).reduce((acc, item) => acc + item, 0) || 0
  const ratio = income > 0 ? Math.min((Math.abs(expense) / income) * 100, 100) : 0

  // --- Planificateur ---
  const totalPlannedExpenses = monthlyPlan.reduce((acc, item) => acc + item.amount, 0);

  const updatePlanAmount = (id: string, value: number) => {
    setMonthlyPlan(monthlyPlan.map(item => item.id === id ? { ...item, amount: value } : item));
  }

  const addCustomExpense = () => {
    const newItem: MonthlyPlanItem = {
      id: Date.now().toString(),
      category: "Nouvelle dépense",
      amount: 0
    };
    setMonthlyPlan([...monthlyPlan, newItem]);
  }

  // --- Comparaison réel vs plan ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyExpensesReal = transactions
    .filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.amount < 0;
    })
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const remainingOrOver = totalPlannedExpenses - monthlyExpensesReal;
  const budgetStatusMessage = remainingOrOver >= 0
    ? `You are within your plan: $${remainingOrOver.toFixed(2)} left`
    : `You have exceeded your plan by $${Math.abs(remainingOrOver).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="w-2/3 flex flex-col gap-4">

      {/* Balance / Income / Expense */}
      <div className="flex justify-between rounded-2xl border-2 border-warning/10 border-dashed bg-warning/5 p-5">
        <div className="flex flex-col gap-1">
          <div className=" badge badge-soft"><Wallet className="w-4 h4" /> Your Balance</div>
          <div className="stat-value">{balance.toFixed(2)}$</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className=" badge badge-soft badge-success"><ArrowUpCircle className="w-4 h4" /> Income</div>
          <div className="stat-value">{income.toFixed(2)} $</div>
        </div>
        <div className="flex flex-col gap-1 ">
          <div className=" badge badge-soft badge-error"><ArrowDownCircle className="w-4 h4" /> Expenses</div>
          <div className="stat-value">{expense.toFixed(2)}$</div>
        </div>
      </div>

      {/* Transactions Table */}
      <button className="btn btn-warning" onClick={() => (document.getElementById('add_modal') as HTMLDialogElement).showModal()}>
        <PlusCircle className="w-4 h-4" /> Ajouter une transaction
      </button>

      <div className="overflow-x-auto rounded-2xl border-2 border-warning/10 border-dashed bg-warning/5 ">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th><th>Action</th></tr>
          </thead>
          <tbody>
            {transactions.map((t, index) => (
              <tr key={t.id}>
                <th>{index + 1}</th>
                <td>{t.text}</td>
                <td className=" font-semibold flex items-center gap-2">
                  {t.amount > 0 ? <TrendingUp className="text-success w-6 h-6" /> : <TrendingDown className="text-error w-6 h-6" />}
                  {t.amount > 0 ? `+${t.amount}` : `${t.amount}`}
                </td>
                <td>{formatDate(t.created_at)}</td>
                <td className="flex gap-2">
                  <button onClick={() => deleteTransaction(t.id)} className="btn btn-sm btn-error btn-soft" title="Supprimer"><Trash className=" w-4 h-4" /></button>
                  <button onClick={() => {
                    setEditingTransaction(t)
                    setText(t.text)
                    setAmount(Math.abs(t.amount))
                    setType(t.amount > 0 ? "income" : "expense")
                    document.getElementById('edit_modal')?.showModal()
                  }} className="btn btn-sm btn-primary btn-soft" title="Modifier">✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Transaction Modal */}
      <dialog id="add_modal" className="modal backdrop-blur">
        <div className="modal-box border-2 border-warning/10 border-dashed">
          <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
          <h3 className="font-bold text-lg">Add a transaction</h3>
          <div className="flex flex-col gap-4 mt-4">
            <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Enter the text…" className="input w-full" />
            <select value={type} onChange={e => setType(e.target.value as "income"|"expense")} className="input w-full">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Enter the amount…" className="input w-full" />
            <button className="w-full btn btn-warning" onClick={addTransaction} disabled={loading}><PlusCircle className="w-4 h-4" /> Ajouter</button>
          </div>
        </div>
      </dialog>

      {/* Edit Transaction Modal */}
      <dialog id="edit_modal" className="modal backdrop-blur">
        <div className="modal-box border-2 border-warning/10 border-dashed">
          <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
          <h3 className="font-bold text-lg">Edit Transaction</h3>
          <div className="flex flex-col gap-4 mt-4">
            <input type="text" value={text} onChange={e => setText(e.target.value)} className="input w-full" />
            <select value={type} onChange={e => setType(e.target.value as "income"|"expense")} className="input w-full">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} className="input w-full" />
            <button className="w-full btn btn-warning" onClick={updateTransaction} disabled={loading}>Save</button>
          </div>
        </div>
      </dialog>

      {/* --- Monthly Planner --- */}
      <div className="rounded-2xl border-2 border-warning/10 border-dashed bg-warning/5 p-5 mt-4">
        <h3 className="font-bold text-lg mb-2">Monthly Planner</h3>

        {monthlyPlan.map(item => (
          <div key={item.id} className="flex gap-2 mb-2 items-center">
            <input
              type="text"
              value={item.category}
              onChange={e => setMonthlyPlan(monthlyPlan.map(i => i.id === item.id ? { ...i, category: e.target.value } : i))}
              className="input w-1/2"
            />
            <input
              type="number"
              value={item.amount}
              onChange={e => updatePlanAmount(item.id, Number(e.target.value))}
              className="input w-1/2"
              placeholder="Montant"
            />
          </div>
        ))}

        <button className="btn btn-sm btn-outline mb-2" onClick={addCustomExpense}>+ Ajouter une dépense</button>

        <div className="flex justify-between font-bold mt-2">
          <span>Total Planifié</span>
          <span>{totalPlannedExpenses.toFixed(2)} $</span>
        </div>

        <div className={`mt-2 font-semibold ${remainingOrOver >= 0 ? "text-success" : "text-error"}`}>
          {budgetStatusMessage}
        </div>

        <button className="btn btn-warning mt-2">Sauvegarder le plan</button>
      </div>

    </div>
  )
}
