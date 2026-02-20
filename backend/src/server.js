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
app.use('/api/islands', islandRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/daily-reward', dailyRewardRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/auto-production', autoProductionRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route bulunamadi' });
});

app.listen(PORT, () => {
  console.log('Server calisiyor: http://localhost:' + PORT);
});