"use client"
import { useEffect, useState } from "react";
import api from "./api";
import toast from "react-hot-toast";
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, Trash, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";

type Transaction = { id: string; text: string; amount: number; created_at: string }
type MonthlyPlanItem = { id: string; category: string; amount: number }

export default function Home() {
  const [activeTab, setActiveTab] = useState<"Home"|"Transactions"|"Planner">("Home")
  const [transactionFilter, setTransactionFilter] = useState<"All"|"Income"|"Expense">("All")

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [text, setText] = useState<string>("")
  const [amount, setAmount] = useState<number | "">("")
  const [type, setType] = useState<"income"|"expense">("income")
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

  const getTransactions = async () => {
    try { const res = await api.get<Transaction[]>("transactions/"); setTransactions(res.data) }
    catch(e){ console.error(e); toast.error("Erreur chargement transactions") }
  }

  const deleteTransaction = async (id:string)=>{
    try{ await api.delete(`transactions/${id}/`); getTransactions(); toast.success("Transaction supprimée") }
    catch(e){ toast.error("Erreur suppression") }
  }

  const addTransaction = async ()=>{
    if(!text || amount==="" || isNaN(Number(amount))) return toast.error("Remplir texte et montant valides");
    setLoading(true)
    try{
      const realAmount = type==="expense"?-Math.abs(Number(amount)):Number(amount)
      await api.post<Transaction>("transactions/", { text, amount: realAmount })
      getTransactions(); document.getElementById('add_modal')?.close()
      setText(""); setAmount(""); setType("income"); toast.success("Transaction ajoutée")
    }catch(e){ toast.error("Erreur ajout") }finally{ setLoading(false) }
  }

  const updateTransaction = async ()=>{
    if(!editingTransaction) return
    if(!text || amount==="" || isNaN(Number(amount))) return toast.error("Remplir texte et montant valides")
    setLoading(true)
    try{
      const realAmount = type==="expense"?-Math.abs(Number(amount)):Number(amount)
      await api.put(`transactions/${editingTransaction.id}/`, { text, amount: realAmount })
      getTransactions(); document.getElementById('edit_modal')?.close()
      setEditingTransaction(null); setText(""); setAmount(""); setType("income"); toast.success("Transaction modifiée")
    }catch(e){ toast.error("Erreur modification") }finally{ setLoading(false) }
  }

  useEffect(()=>{ getTransactions() }, [])

  const amounts = transactions.map(t=>Number(t.amount))
  const balance = amounts.reduce((a,b)=>a+b,0)
  const income = amounts.filter(a=>a>0).reduce((a,b)=>a+b,0)
  const expense = amounts.filter(a=>a<0).reduce((a,b)=>a+b,0)

  const totalPlannedExpenses = monthlyPlan.reduce((a,b)=>a+b.amount,0)
  const updatePlanAmount = (id:string,value:number)=>setMonthlyPlan(monthlyPlan.map(i=>i.id===id?{...i,amount:value}:i))
  const addCustomExpense = ()=>setMonthlyPlan([...monthlyPlan,{id:Date.now().toString(),category:"Nouvelle dépense",amount:0}])

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthlyExpensesReal = transactions
    .filter(t=>{const d=new Date(t.created_at); return d.getMonth()===currentMonth && d.getFullYear()===currentYear && t.amount<0})
    .reduce((acc,t)=>acc+Math.abs(t.amount),0)

  const remainingOrOver = totalPlannedExpenses - monthlyExpensesReal
  const budgetStatusMessage = remainingOrOver>=0 ? `Within plan: $${remainingOrOver.toFixed(2)}` : `Over plan by $${Math.abs(remainingOrOver).toFixed(2)}`

  const formatDate = (d:string)=>new Date(d).toLocaleDateString("fr-FR",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
  const filteredTransactions = transactions.filter(t=>{
    if(transactionFilter==="All") return true
    if(transactionFilter==="Income") return t.amount>0
    return t.amount<0
  })

  return (
    <div className="w-full md:w-4/5 mx-auto p-4 font-sans">

      {/* Onglets */}
      <div className="flex gap-4 mb-6 border-b-2 border-gray-200">
        {["Home","Transactions","Planner"].map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab as typeof activeTab)}
            className={`px-5 py-2 rounded-t-lg transition-colors duration-200 font-semibold ${activeTab===tab?"bg-warning text-white shadow-md":"hover:bg-gray-100"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* --- Home --- */}
      {activeTab==="Home" && (
        <div className="flex flex-col gap-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-yellow-50 shadow hover:shadow-lg transition">
              <Wallet className="w-6 h-6 mb-2 text-yellow-600"/>
              <div className="font-semibold">Balance</div>
              <div className="text-xl font-bold">{balance.toFixed(2)} $</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 shadow hover:shadow-lg transition">
              <ArrowUpCircle className="w-6 h-6 mb-2 text-green-600"/>
              <div className="font-semibold">Income</div>
              <div className="text-xl font-bold">{income.toFixed(2)} $</div>
            </div>
            <div className="p-4 rounded-xl bg-red-50 shadow hover:shadow-lg transition">
              <ArrowDownCircle className="w-6 h-6 mb-2 text-red-600"/>
              <div className="font-semibold">Expenses</div>
              <div className="text-xl font-bold">{expense.toFixed(2)} $</div>
            </div>
          </div>

          {/* PieChart */}
          <div className="w-full h-64 bg-white rounded-xl p-4 shadow-md">
            <h3 className="font-semibold mb-2">Income vs Expense</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={[{name:"Income",value:income},{name:"Expense",value:Math.abs(expense)}]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={80}
                  label
                >
                  <Cell key="income" fill="#22c55e"/>
                  <Cell key="expense" fill="#ef4444"/>
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* BarChart */}
          <div className="w-full h-64 bg-white rounded-xl p-4 shadow-md">
            <h3 className="font-semibold mb-2">Budget Plan vs Real Expenses</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={[{name:"Monthly",Planned:totalPlannedExpenses,Real:monthlyExpensesReal}]}>
                <XAxis dataKey="name"/>
                <YAxis/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="Planned" fill="#3b82f6"/>
                <Bar dataKey="Real" fill="#f59e0b"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* --- Transactions --- */}
      {activeTab==="Transactions" && (
        <div className="flex flex-col gap-4">

          {/* Filtres internes */}
          <div className="flex gap-2 mb-2">
            {["All","Income","Expense"].map(f=>
              <button key={f} onClick={()=>setTransactionFilter(f as typeof transactionFilter)}
                className={`px-4 py-1 rounded font-semibold ${transactionFilter===f?"bg-warning text-white":"bg-gray-200 hover:bg-gray-300"}`}>
                {f}
              </button>
            )}
          </div>

          <button className="btn btn-warning mb-2 flex items-center gap-2" onClick={()=>document.getElementById('add_modal')?.showModal()}>
            <PlusCircle className="w-4 h-4"/> Ajouter
          </button>

          <div className="overflow-x-auto rounded-xl border shadow-md">
            <table className="table w-full">
              <thead className="bg-gray-100"><tr><th>#</th><th>Description</th><th>Montant</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {filteredTransactions.map((t,i)=>(
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td>{i+1}</td>
                    <td>{t.text}</td>
                    <td className={`flex items-center gap-1 font-semibold ${t.amount>0?"text-green-600":"text-red-600"}`}>
                      {t.amount>0?<TrendingUp/>:<TrendingDown/>}{t.amount>0?`+${t.amount}`:`${t.amount}`}
                    </td>
                    <td>{formatDate(t.created_at)}</td>
                    <td className="flex gap-2">
                      <button onClick={()=>deleteTransaction(t.id)} className="btn btn-sm btn-error btn-outline"><Trash className="w-4 h-4"/></button>
                      <button onClick={()=>{
                        setEditingTransaction(t)
                        setText(t.text)
                        setAmount(Math.abs(t.amount))
                        setType(t.amount>0?"income":"expense")
                        document.getElementById('edit_modal')?.showModal()
                      }} className="btn btn-sm btn-primary btn-outline">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- Monthly Planner --- */}
      {activeTab==="Planner" && (
        <div className="rounded-xl border p-4 bg-blue-50 shadow-md">
          <h2 className="text-xl font-bold mb-4">Monthly Planner</h2>
          {monthlyPlan.map(item=>(
            <div key={item.id} className="flex gap-2 mb-2 items-center">
              <input type="text" value={item.category} onChange={e=>setMonthlyPlan(monthlyPlan.map(i=>i.id===item.id?{...i,category:e.target.value}:i))} className="input w-1/2"/>
              <input type="number" value={item.amount} onChange={e=>updatePlanAmount(item.id,Number(e.target.value))} className="input w-1/2" placeholder="Montant"/>
            </div>
          ))}
          <button className="btn btn-sm btn-outline mb-2" onClick={addCustomExpense}>+ Ajouter une dépense</button>
          <div className="flex justify-between font-semibold">
            <span>Total Planifié</span><span>{totalPlannedExpenses.toFixed(2)} $</span>
          </div>
          <div className={`mt-2 font-semibold ${remainingOrOver>=0?"text-green-600":"text-red-600"}`}>{budgetStatusMessage}</div>
          <button className="btn btn-warning mt-2">Sauvegarder le plan</button>
        </div>
      )}

      {/* --- Modals --- */}
      <dialog id="add_modal" className="modal backdrop-blur">
        <div className="modal-box">
          <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
          <h3 className="font-bold text-lg">Ajouter Transaction</h3>
          <input type="text" value={text} onChange={e=>setText(e.target.value)} placeholder="Description" className="input w-full my-2"/>
          <select value={type} onChange={e=>setType(e.target.value as "income"|"expense")} className="input w-full my-2">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value===""?"":Number(e.target.value))} placeholder="Montant" className="input w-full my-2"/>
          <button className="btn btn-warning w-full" onClick={addTransaction} disabled={loading}><PlusCircle className="w-4 h-4 mr-2"/>Ajouter</button>
        </div>
      </dialog>

      <dialog id="edit_modal" className="modal backdrop-blur">
        <div className="modal-box">
          <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
          <h3 className="font-bold text-lg">Modifier Transaction</h3>
          <input type="text" value={text} onChange={e=>setText(e.target.value)} className="input w-full my-2"/>
          <select value={type} onChange={e=>setType(e.target.value as "income"|"expense")} className="input w-full my-2">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value===""?"":Number(e.target.value))} className="input w-full my-2"/>
          <button className="btn btn-warning w-full" onClick={updateTransaction} disabled={loading}>Save</button>
        </div>
      </dialog>

    </div>
  )
}
