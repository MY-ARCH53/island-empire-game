const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const islandRoutes = require('./routes/island.routes');
const resourceRoutes = require('./routes/resource.routes');
const buildingRoutes = require('./routes/building.routes');
const productionRoutes = require('./routes/production.routes');
const taskRoutes = require('./routes/task.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const dailyRewardRoutes = require('./routes/dailyReward.routes');
const friendRoutes = require('./routes/friend.routes');
const guildRoutes = require('./routes/guild.routes');
const battleRoutes = require('./routes/battle.routes');
const autoProductionRoutes = require('./routes/autoProduction.routes');
const adminRoutes = require('./routes/admin.routes');
const tlcoinRoutes = require('./routes/tlcoin.routes');
const tradeRoutes  = require('./routes/trade.routes');
const spinRoutes   = require('./routes/spin.routes');
const { startWorker } = require('./services/autoProductionWorker');
const instagramRoutes = require('./routes/instagram.routes');
const { startInstagramWorker } = require('./services/instagramWorker');
const chatRoutes = require('./routes/chat.routes');
const { startAutoAttackWorker } = require('./services/autoAttackWorker');
const banCheck = require('./middleware/banCheck.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Backend calisyor'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/islands',         banCheck, islandRoutes);
app.use('/api/resources',       banCheck, resourceRoutes);
app.use('/api/buildings',       banCheck, buildingRoutes);
app.use('/api/production',      banCheck, productionRoutes);
app.use('/api/tasks',           banCheck, taskRoutes);
app.use('/api/marketplace',     banCheck, marketplaceRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/daily-reward',    banCheck, dailyRewardRoutes);
app.use('/api/friends',         banCheck, friendRoutes);
app.use('/api/guilds',          banCheck, guildRoutes);
app.use('/api/battles',         banCheck, battleRoutes);
app.use('/api/auto-production', banCheck, autoProductionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tlcoin',          banCheck, tlcoinRoutes);
app.use('/api/trade',           banCheck, tradeRoutes);
app.use('/api/spin',            banCheck, spinRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/chat',           banCheck, chatRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route bulunamadi' });
});

app.listen(PORT, () => {
  console.log('Server calisiyor: http://localhost:' + PORT);
  startWorker();
  startInstagramWorker();
  startAutoAttackWorker();
});