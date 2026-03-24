import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { marketplaceAPI } from '../services/api';

function MarketplacePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [prices, setPrices] = useState<any>({});
  const [selectedResource, setSelectedResource] = useState('wood');
  const [amount, setAmount] = useState(10);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUser(user);

        const pricesRes = await marketplaceAPI.getPrices();
        setPrices(pricesRes.data.data.prices);

        try {
          const transactionsRes = await marketplaceAPI.getTransactions(user.id);
          setTransactions(transactionsRes.data.data.transactions);
        } catch {
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error('Marketplace load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!user) return;

    try {
      const response = await marketplaceAPI.buyResource(user.id, selectedResource, amount);
      alert(response.data.message);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Satın alma başarısız');
    }
  };

  const handleSell = async () => {
    if (!user) return;

    try {
      const response = await marketplaceAPI.sellResource(user.id, selectedResource, amount);
      alert(response.data.message);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Satış başarısız');
    }
  };

  const resourceNames: any = {
    wood: { name: '🌲 Odun', color: 'from-green-400 to-emerald-500' },
    food: { name: '🍎 Yiyecek', color: 'from-red-400 to-orange-500' },
    energy: { name: '⚡ Enerji', color: 'from-cyan-400 to-blue-500' }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-xl text-white font-semibold">Pazar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-card mb-4 animate-fadeIn">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-3 transition hover-lift"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </button>
          <div className="flex items-center gap-3">
            <div className="text-4xl">🏪</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                Pazar Yeri
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </h1>
              <p className="text-sm text-gray-600">Kaynakları al ve sat!</p>
            </div>
          </div>
        </div>

        {/* Fiyat Tablosu */}
        <div className="glass-card mb-4 animate-slideInLeft">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            💰 Güncel Fiyatlar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(prices).map(([resource, data]: any, index) => {
              if (resource === 'gold') return null;
              
              const config = resourceNames[resource];
              
              return (
                <div
                  key={resource}
                  onClick={() => setSelectedResource(resource)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition hover-lift animate-slideInLeft ${
                    selectedResource === resource
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-center mb-3">
                    <div className={`text-3xl mb-2 bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                      {config.name.split(' ')[0]}
                    </div>
                    <p className="font-semibold text-gray-800">{config.name.split(' ')[1]}</p>
                  </div>
                  <div className="flex justify-around text-sm">
                    <div className="text-center">
                      <p className="text-gray-600 text-xs mb-1">Alış</p>
                      <p className="font-bold text-green-600 flex items-center gap-1 justify-center">
                        <TrendingUp className="w-4 h-4" />
                        {data.buy} 💰
                      </p>
                    </div>
                    <div className="h-10 w-px bg-gray-200"></div>
                    <div className="text-center">
                      <p className="text-gray-600 text-xs mb-1">Satış</p>
                      <p className="font-bold text-red-600 flex items-center gap-1 justify-center">
                        <TrendingDown className="w-4 h-4" />
                        {data.sell} 💰
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alım Satım */}
        <div className="glass-card mb-4 animate-slideInRight">
          <h2 className="font-bold text-gray-800 mb-4">📊 İşlem Yap</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miktar
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleBuy}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-xl font-semibold transition-all btn-modern shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span>Satın Al</span>
              </div>
              <div className="text-sm opacity-90">
                {amount} {resourceNames[selectedResource]?.name} = {(prices[selectedResource]?.buy || 0) * amount} 💰
              </div>
            </button>

            <button
              onClick={handleSell}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold transition-all btn-modern shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown className="w-5 h-5" />
                <span>Sat</span>
              </div>
              <div className="text-sm opacity-90">
                {amount} {resourceNames[selectedResource]?.name} = {(prices[selectedResource]?.sell || 0) * amount} 💰
              </div>
            </button>
          </div>
        </div>

        {/* İşlem Geçmişi */}
        <div className="glass-card animate-fadeIn">
          <h2 className="font-bold text-gray-800 mb-4">📜 İşlem Geçmişi</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600">Henüz işlem yapılmadı.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className={`p-3 rounded-xl transition hover-lift animate-slideInLeft ${
                    tx.transaction_type === 'buy' 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                      : 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        tx.transaction_type === 'buy' ? 'bg-green-200' : 'bg-red-200'
                      }`}>
                        {tx.transaction_type === 'buy' ? '🛒' : '💸'}
                      </div>
                      <div>
                        <span className={`font-semibold ${
                          tx.transaction_type === 'buy' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {tx.transaction_type === 'buy' ? 'Alış' : 'Satış'}
                        </span>
                        <span className="ml-2 text-gray-700">
                          {tx.amount} {resourceNames[tx.resource_type]?.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">
                        {tx.price * tx.amount} 💰
                      </p>
                      <p className="text-xs text-gray-500">
                        @ {tx.price}💰 birim
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketplacePage;