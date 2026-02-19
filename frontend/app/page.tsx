"use client"
import { useEffect, useState, useRef } from "react";
import api from "./api";
import toast from "react-hot-toast";
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import { ArrowUp, ArrowDown, Trash, Pencil } from "lucide-react";


type Transaction = { id: string; text: string; amount: number; created_at: string }
type MonthlyPlanItem = { id: string; category: string; amount: number }

function Home() {
  const [activeTab, setActiveTab] = useState<"Home"|"Transactions"|"Planner">("Home")
  const [transactionFilter, setTransactionFilter] = useState<"All"|"Income"|"Expense">("All")
  const [isMounted, setIsMounted] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [text, setText] = useState<string>("")
  const [amount, setAmount] = useState<number | "">("")
  const [type, setType] = useState<"income"|"expense">("income")
  const [loading, setLoading] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlanItem[]>([])
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const addModalRef = useRef<HTMLDialogElement>(null)
  const editModalRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    setIsMounted(true)
    getTransactions()
    getMonthlyPlan()
  }, [])

  // ------------------- Transactions -------------------
  const getTransactions = async () => {
    try { 
      const res = await api.get<Transaction[]>("transactions/"); 
      if (res.data) setTransactions(res.data) 
    } catch(e){ console.error(e); }
  }

  const deleteTransaction = async (id:string)=>{
    try{ 
      await api.delete(`transactions/${id}/`); 
      getTransactions(); 
      toast.success("Transaction deleted") 
    } catch(e){ toast.error("Error deleting transaction") }
  }

  const addTransaction = async ()=>{
    if(!text || amount==="" || isNaN(Number(amount))) return toast.error("Fill in valid text and amount");
    setLoading(true)
    try{
      const realAmount = type==="expense"?-Math.abs(Number(amount)):Math.abs(Number(amount))
      await api.post<Transaction>("transactions/", { text, amount: realAmount })
      getTransactions(); 
      addModalRef.current?.close()
      setText(""); setAmount(""); setType("income"); toast.success("Transaction added")
    }catch(e){ toast.error("Error adding transaction") }finally{ setLoading(false) }
  }

  const updateTransaction = async ()=>{
    if(!editingTransaction) return
    if(!text || amount==="" || isNaN(Number(amount))) return toast.error("Enter valid text and amount")
    setLoading(true)
    try{
      const realAmount = type==="expense"?-Math.abs(Number(amount)):Math.abs(Number(amount))
      await api.put(`transactions/${editingTransaction.id}/`, { text, amount: realAmount })
      getTransactions(); 
      editModalRef.current?.close()
      setEditingTransaction(null); setText(""); setAmount(""); setType("income"); toast.success("Transaction updated")
    }catch(e){ toast.error("Edit error") }finally{ setLoading(false) }
  }

  // ------------------- Monthly Planner (Synchronisation Améliorée) -------------------
  const getMonthlyPlan = async () => {
    try {
      const res = await api.get<MonthlyPlanItem[]>("monthly-plan/");
      if (res.data && Array.isArray(res.data)) setMonthlyPlan(res.data);
    } catch(e) { console.warn("Server error in planner fetch."); }
  }

  const saveMonthlyPlanItem = async (item: MonthlyPlanItem) => {
    try {
      const isNew = item.id.toString().includes("temp_");
      
      if (isNew) {
        const res = await api.post(`monthly-plan/`, { category: item.category, amount: item.amount });
        setMonthlyPlan(prev => prev.map(i => i.id === item.id ? res.data : i));
      } else {
        await api.put(`monthly-plan/${item.id}/`, { category: item.category, amount: item.amount });
      }
    } catch(e) { 
      console.error("Error sync server pour:", item.category);
    }
  }

  const handleUpdatePlan = (id: string, field: "category" | "amount", value: any) => {
    const updatedPlan = monthlyPlan.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === "amount" ? (value === "" ? 0 : Number(value)) : value };
      }
      return item;
    });
    setMonthlyPlan(updatedPlan);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
        const itemToSave = updatedPlan.find(i => i.id === id);
        if (itemToSave) saveMonthlyPlanItem(itemToSave);
    }, 1200);
  }

  const addCustomExpense = () => {
    const newItem = { id: `temp_${Date.now()}`, category: "New Expense", amount: 0 };
    setMonthlyPlan([...monthlyPlan, newItem]);
  }

  const removePlanItem = async (id: string) => {
    const isTemp = id.toString().includes("temp_");
    setMonthlyPlan(monthlyPlan.filter(i => i.id !== id));
    if (!isTemp) {
      try { 
        await api.delete(`monthly-plan/${id}/`); 
        toast.success("Category deleted"); 
      } catch(e) { toast.error("Server deletion error"); }
    }
  }

  // ------------------- Data Processing -------------------
  const income = transactions.filter(t=>Number(t.amount)>0).reduce((a,b)=>a+Number(b.amount),0)
  const expense = transactions.filter(t=>Number(t.amount)<0).reduce((a,b)=>a+Number(b.amount),0)
  const balance = income + expense
  const totalPlannedExpenses = monthlyPlan.reduce((a,b)=>a+(Number(b.amount) || 0),0)

  const monthlyExpensesReal = transactions
    .filter(t=>{
        const d=new Date(t.created_at); 
        return d.getMonth()===new Date().getMonth() && Number(t.amount)<0
    })
    .reduce((acc,t)=>acc+Math.abs(Number(t.amount)),0)

  const remainingOrOver = totalPlannedExpenses - monthlyExpensesReal
  const budgetStatusMessage = remainingOrOver>=0 ? `Within plan: $${remainingOrOver.toFixed(2)}` : `Over plan by $${Math.abs(remainingOrOver).toFixed(2)}`

  const formatDate = (d:string)=>new Date(d).toLocaleDateString("fr-FR",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
  
  const filteredTransactions = transactions.filter(t=>{
    if(transactionFilter==="All") return true
    if(transactionFilter==="Income") return Number(t.amount)>0
    return Number(t.amount)<0
  })

  const plannedVsRealData = monthlyPlan.map(item=>{
    const real = transactions
      .filter(t=>Number(t.amount)<0 && t.text.toLowerCase().includes(item.category.toLowerCase()))
      .reduce((acc,t)=>acc+Math.abs(Number(t.amount)),0)
    return { name:item.category, Planned:item.amount, Real:real }
  })

  const monthlyChartData = Array.from({length:12},(_,i)=>{
    const monthTotal = transactions
      .filter(t=>{const d=new Date(t.created_at); return d.getMonth()===i && Number(t.amount)<0})
      .reduce((acc,t)=>acc+Math.abs(Number(t.amount)),0)
    return { month:`${i+1}`, Expenses:monthTotal }
  })

  if (!isMounted) return null;

  return (
    <div className="w-full md:w-4/5 mx-auto p-4 font-sans">
      {/* Onglets */}
      <div className="flex gap-4 mb-6 border-b-2 border-gray-200">
        {["Home","Transactions","Planner"].map(tab=>(
          <button key={tab} suppressHydrationWarning onClick={()=>setActiveTab(tab as any)}
            className={`px-5 py-2 rounded-t-lg text-white transition-colors duration-200 font-semibold ${activeTab===tab?"bg-warning text-white shadow-md":"hover:bg-gray-100"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* --- Home --- */}
      {activeTab==="Home" && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white-800">
            <div className="p-4 rounded-xl bg-yellow-50 shadow border border-yellow-100">
              <Wallet className="w-6 h-6 mb-2 text-yellow-600"/><div className="font-semibold text-sm opacity-70">Balance</div><div className="text-xl font-bold">{balance.toFixed(2)} $</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 shadow border border-green-100">
              <ArrowUpCircle className="w-6 h-6 mb-2 text-green-600"/><div className="font-semibold text-sm opacity-70">Income</div><div className="text-xl font-bold">{income.toFixed(2)} $</div>
            </div>
            <div className="p-4 rounded-xl bg-red-50 shadow border border-red-100">
              <ArrowDownCircle className="w-6 h-6 mb-2 text-red-600"/><div className="font-semibold text-sm opacity-70">Expenses</div><div className="text-xl font-bold">{Math.abs(expense).toFixed(2)} $</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full h-64 bg-black rounded-xl p-4 shadow-md border">
              <h3 className="font-semibold mb-2">Income vs Expense</h3>
              <ResponsiveContainer width="100%" height="90%"><PieChart>
                  <Pie data={[{name:"Income",value:income},{name:"Expense",value:Math.abs(expense)}]} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} label>
                    <Cell key="income" fill="#026426"/><Cell key="expense" fill="#741414"/>
                  </Pie><Tooltip/></PieChart></ResponsiveContainer>
            </div>
            <div className="w-full h-64 bg-white rounded-xl p-4 shadow-md border">
              <h3 className="font-semibold mb-2">Budget Plan vs Real</h3>
              <ResponsiveContainer width="100%" height="90%"><BarChart data={[{name:"Monthly",Planned:totalPlannedExpenses,Real:monthlyExpensesReal}]}>
                  <XAxis dataKey="name"/> <YAxis/> <Tooltip/> <Legend/>
                  <Bar dataKey="Planned" fill="#0c4845"/><Bar dataKey="Real" fill="#611313"/>
                </BarChart></ResponsiveContainer>
            </div>
            <div className="w-full h-64 bg-white rounded-xl p-4 shadow-md border">
              <h3 className="font-semibold mb-2">Planned vs Actual by Category</h3>
              <ResponsiveContainer width="100%" height="90%"><BarChart data={plannedVsRealData}>
                  <XAxis dataKey="name"/> <YAxis/> <Tooltip/> <Legend/>
                  <Bar dataKey="Planned" fill="#043336"/><Bar dataKey="Real" fill="#680505"/>
                </BarChart></ResponsiveContainer>
            </div>
            <div className="w-full h-64 bg-white rounded-xl p-4 shadow-md border">
              <h3 className="font-semibold mb-2">Monthly Expense Growth</h3>
              <ResponsiveContainer width="100%" height="90%"><BarChart data={monthlyChartData}>
                  <XAxis dataKey="month"/> <YAxis/> <Tooltip/> <Legend/>
                  <Bar dataKey="Expenses" fill="#282628ea"/>
                </BarChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- Transactions --- */}
      {activeTab==="Transactions" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 mb-2">
            {["All","Income","Expense"].map(f=>
              <button key={f} suppressHydrationWarning onClick={()=>setTransactionFilter(f as any)}
                className={`px-4 py-1 rounded font-semibold ${transactionFilter===f?"bg-warning text-white":"bg-gray-200 hover:bg-gray-300"}`}>{f}</button>
            )}
          </div>
          <button className="btn btn-warning flex items-center bg-white gap-2 w-fit mb-2" onClick={()=> addModalRef.current?.showModal()}><PlusCircle size={18}/> Add</button>
          <div className="overflow-x-auto rounded-xl border shadow-md">
            <table className="table w-full">
              <thead className="bg-gray-100"><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {filteredTransactions.map((t,i)=>(
                  <tr key={t.id} className="hover:bg-gray-50 text-gray-700">
  <td>{i + 1}</td>

  <td>{t.text}</td>

  <td
    className={`font-semibold flex items-center gap-1 ${
      Number(t.amount) > 0 ? "text-green-600" : "text-red-600"
    }`}
  >
    {Number(t.amount) > 0 ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    )}
    {Number(t.amount).toFixed(2)} $
  </td>

  <td>{formatDate(t.created_at)}</td>

  <td className="flex gap-2">
    <button
      onClick={() => deleteTransaction(t.id)}
      className="btn btn-sm btn-error btn-outline"
    >
      <Trash size={14} />
    </button>

    <button
      onClick={() => {
        setEditingTransaction(t);
        setText(t.text);
        setAmount(Math.abs(Number(t.amount)));
        setType(Number(t.amount) > 0 ? "income" : "expense");
        editModalRef.current?.showModal();
      }}
      className="btn btn-sm btn-primary btn-outline"
    >
      <Pencil size={14} />
    </button>
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
        <div className="rounded-2xl border border-gray-200 p-6 bg-white shadow-md">

          <h2 className="text-xl font-bold mb-4 text-black-900">Monthly Planner</h2>
          <div className="overflow-x-auto rounded-xl border mb-4 bg-white shadow-sm">
            <table className="table w-full">
              <thead className="bg-gray-100"><tr><th>Description</th><th>Budget ($)</th><th>Action</th></tr></thead>
              <tbody>
                {monthlyPlan.map((item)=>(
                  <tr key={item.id}>
                    <td><input type="text" value={item.category} onChange={e=>handleUpdatePlan(item.id, "category", e.target.value)} className="input input-bordered w-full"/></td>
                    <td><input type="number" value={item.amount} onChange={e=>handleUpdatePlan(item.id, "amount", e.target.value)} className="input input-bordered w-full"/></td>
                    <td><button className="btn btn-sm btn-error" onClick={()=>removePlanItem(item.id)}><Trash size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-sm btn-outline bg-white mr-2" onClick={addCustomExpense}>+ Add a row</button>
          <div className="mt-6 p-4 bg-white rounded-lg border border-blue-100 font-bold">
            <div className="flex justify-between border-b pb-2 mb-2 text-gray-700"><span>Total Budgeted Amount:</span><span>{totalPlannedExpenses.toFixed(2)} $</span></div>
            <div className={`${remainingOrOver>=0?"text-green-600":"text-red-600"}`}>{budgetStatusMessage}</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <dialog ref={addModalRef} className="modal backdrop-blur bg-black/30">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">New Transaction</h3>
          <input type="text" value={text} onChange={e=>setText(e.target.value)} placeholder="Description" className="input input-bordered w-full my-2"/>
          <select value={type} onChange={e=>setType(e.target.value as any)} className="select select-bordered w-full my-2 text-gray-700">
            <option value="income">Income(+)</option><option value="expense">Expense(-)</option>
          </select>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value===""?"":Number(e.target.value))} placeholder="Amount" className="input input-bordered w-full my-2"/>
          <div className="modal-action">
            <button className="btn" onClick={()=>addModalRef.current?.close()}>Cancel</button>
            <button className="btn btn-warning" onClick={addTransaction} disabled={loading}>Add</button>
          </div>
        </div>
      </dialog>

      <dialog ref={editModalRef} className="modal backdrop-blur">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Edit</h3>
          <input type="text" value={text} onChange={e=>setText(e.target.value)} className="input input-bordered w-full my-2"/>
          <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="input input-bordered w-full my-2"/>
          <div className="modal-action">
            <button className="btn" onClick={()=>editModalRef.current?.close()}>Cancel</button>
            <button className="btn btn-warning" onClick={updateTransaction} disabled={loading}>Save</button>
          </div>
        </div>
      </dialog>
    </div>
  )
}

export default Home;