const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

exports.getMyInvestments = catchAsync(async (req, res) => {
  const investments = await db.any('SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at', [req.user.id]);

  const withMetrics = investments.map((inv) => {
    const marketValue = Number(inv.shares) * Number(inv.current_price);
    const costBasis = Number(inv.shares) * Number(inv.avg_cost);
    return {
      ...inv,
      marketValue: Number(marketValue.toFixed(2)),
      totalGainLoss: Number((marketValue - costBasis).toFixed(2)),
      totalGainLossPct: costBasis > 0 ? Number((((marketValue - costBasis) / costBasis) * 100).toFixed(2)) : 0,
    };
  });

  const portfolioValue = withMetrics.reduce((sum, i) => sum + i.marketValue, 0);

  res.status(200).json({
    status: 'success',
    results: withMetrics.length,
    data: { investments: withMetrics, portfolioValue: Number(portfolioValue.toFixed(2)) },
  });
});
