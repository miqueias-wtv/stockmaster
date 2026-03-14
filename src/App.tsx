import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Package,
  Monitor,
  Smartphone,
  Laptop,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  LogOut,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithEmail, registerWithEmail, logout } from './firebase';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product
} from './api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'computador' as Product['category'],
    quantity: '' as string | number,
    price: '' as string | number
  });

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // --- Auth Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    // Processa resultado do login via redirect
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setUser(result.user);
          setIsAuthReady(true);
          showToast('Login realizado com sucesso!');
        }
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
          return;
        }
        console.error('Login error:', error);
        showToast('Erro ao fazer login. Verifique se popups estão habilitados e tente novamente.');
      });

    return () => unsubscribe();
  }, [showToast]);

  // --- Load Products ---
  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchProducts(user.uid);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast('Erro ao carregar produtos do servidor.');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (isAuthReady && user) {
      setLoading(true);
      loadProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [isAuthReady, user, loadProducts]);

  // --- Actions ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await createProduct(user.uid, {
        name: newProduct.name,
        category: newProduct.category,
        quantity: Number(newProduct.quantity) || 0,
        price: Number(newProduct.price) || 0,
      });
      setIsModalOpen(false);
      setNewProduct({ name: '', category: 'computador', quantity: '', price: '' });
      await loadProducts();
      showToast('Produto adicionado com sucesso!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao criar produto.');
    }
  };

  const handleUpdateQuantity = async (id: string, current: number, delta: number) => {
    if (!user) return;
    const newQty = Math.max(0, current + delta);
    try {
      await updateProduct(user.uid, id, { quantity: newQty });
      await loadProducts();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao atualizar quantidade.');
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (!user) return;
    try {
      await updateProduct(user.uid, id, { price: newPrice });
      await loadProducts();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao atualizar preço.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Deseja realmente excluir este item?')) return;

    setDeletingId(id);
    try {
      await deleteProduct(user.uid, id);
      await loadProducts();
      showToast('Produto excluído com sucesso.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir produto.');
    } finally {
      setDeletingId(null);
    }
  };

  // Estado para formulário de login/registro
  const [authForm, setAuthForm] = useState({ email: '', password: '', isRegister: false });

  const handleAuthFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authForm.isRegister) {
        await registerWithEmail(authForm.email, authForm.password);
        showToast('Conta criada com sucesso! Faça login.');
        setAuthForm({ ...authForm, isRegister: false });
      } else {
        await loginWithEmail(authForm.email, authForm.password);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro na autenticação.');
    }
  };

  // --- Filtering ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center font-sans">
        <div className="animate-pulse text-neutral-400">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-12 shadow-sm border border-neutral-100 text-center"
        >
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Package className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 mb-4 tracking-tight">StockMaster Pro</h1>
          <p className="text-neutral-500 mb-10 leading-relaxed">
            Gerencie seu estoque de peças de informática com simplicidade e privacidade local.
          </p>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="E-mail"
              value={authForm.email}
              onChange={handleAuthFormChange}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Senha"
              value={authForm.password}
              onChange={handleAuthFormChange}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="w-full py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-3"
            >
              {authForm.isRegister ? 'Criar conta' : 'Entrar'}
              <ArrowRight size={18} />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setAuthForm({ ...authForm, isRegister: !authForm.isRegister })}
            className="mt-4 text-neutral-500 hover:underline"
          >
            {authForm.isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Criar conta'}
          </button>
        </motion.div>

        {/* Toast in Login Screen */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 max-w-md"
            >
              <span className="text-sm flex-1">{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-red-500 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
              <Package className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">StockMaster</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{user.displayName}</p>
              <p className="text-xs text-neutral-400 text-ellipsis overflow-hidden max-w-[150px] whitespace-nowrap">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-red-500"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100"
          >
            <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Valor Total</p>
            <h2 className="text-4xl font-light">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </h2>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100"
          >
            <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Total de Itens</p>
            <h2 className="text-4xl font-light">{totalItems}</h2>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex items-end justify-between"
          >
            <div>
              <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Produtos Únicos</p>
              <h2 className="text-4xl font-light">{products.length}</h2>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-14 h-14 bg-neutral-900 text-white rounded-2xl flex items-center justify-center hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
            >
              <Plus size={28} />
            </button>
          </motion.div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar peças..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all text-sm"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {['all', 'computador', 'notebook', 'celular', 'outro'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${filterCategory === cat
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'bg-white text-neutral-500 border border-neutral-100 hover:bg-neutral-50'
                  }`}
              >
                {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center text-neutral-400">Carregando estoque...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-20 text-center">
              <Package className="mx-auto text-neutral-200 mb-4" size={48} />
              <p className="text-neutral-400">Nenhum produto encontrado no seu estoque.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-50">
                    <th className="px-8 py-6 text-xs font-semibold text-neutral-400 uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-6 text-xs font-semibold text-neutral-400 uppercase tracking-widest">Categoria</th>
                    <th className="px-8 py-6 text-xs font-semibold text-neutral-400 uppercase tracking-widest">Quantidade</th>
                    <th className="px-8 py-6 text-xs font-semibold text-neutral-400 uppercase tracking-widest">Preço Unitário</th>
                    <th className="px-8 py-6 text-xs font-semibold text-neutral-400 uppercase tracking-widest">Subtotal</th>
                    <th className="px-8 py-6 text-xs font-semibold text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={product.id}
                        className="group hover:bg-neutral-50/50 transition-colors border-b border-neutral-50 last:border-0"
                      >
                        <td className="px-8 py-6">
                          <p className="font-medium text-neutral-900">{product.name}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-neutral-500">
                            {product.category === 'computador' && <Monitor size={14} />}
                            {product.category === 'notebook' && <Laptop size={14} />}
                            {product.category === 'celular' && <Smartphone size={14} />}
                            {product.category === 'outro' && <Package size={14} />}
                            <span className="text-sm capitalize">{product.category}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleUpdateQuantity(product.id, product.quantity, -1)}
                              className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <span className={`text-sm font-semibold w-8 text-center ${product.quantity <= 5 ? 'text-red-500' : ''}`}>
                              {product.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(product.id, product.quantity, 1)}
                              className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
                            >
                              <ChevronUp size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400 text-xs">R$</span>
                            <input
                              type="number"
                              key={`${product.id}-${product.price}`}
                              defaultValue={product.price}
                              onBlur={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                if (newPrice !== product.price) {
                                  handleUpdatePrice(product.id, newPrice);
                                }
                              }}
                              className="w-24 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-900 focus:outline-none text-sm font-medium transition-all"
                            />
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-semibold text-neutral-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price * product.quantity)}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            disabled={deletingId === product.id}
                            onClick={() => handleDelete(product.id)}
                            className={`p-2 transition-colors ${deletingId === product.id ? 'text-neutral-200 animate-pulse' : 'text-neutral-300 hover:text-red-500'}`}
                            title="Excluir produto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Add Product */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-semibold mb-8 tracking-tight">Novo Produto</h3>
              <form onSubmit={handleAddProduct} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Nome da Peça</label>
                  <input
                    required
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    placeholder="Ex: SSD 480GB Kingston"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Categoria</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                      className="w-full px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all appearance-none"
                    >
                      <option value="computador">Computador</option>
                      <option value="notebook">Notebook</option>
                      <option value="celular">Celular</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Quantidade</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value === '' ? '' : (parseInt(e.target.value) || 0) })}
                      className="w-full px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Preço Unitário (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })}
                    className="w-full px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-neutral-500 font-medium hover:bg-neutral-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-neutral-900 text-white font-medium rounded-2xl hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 max-w-md"
            style={{
              backgroundColor: toastMessage.includes('Erro') ? 'rgb(220, 38, 38)' : 'rgb(23, 23, 23)'
            }}
          >
            <span className="text-sm flex-1">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
