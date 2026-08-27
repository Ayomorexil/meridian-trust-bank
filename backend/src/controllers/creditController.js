const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

const gradeFor = (pct) => {
  if (pct >= 95) return 'Excellent';
  if (pct >= 80) return 'Very Good';
  if (pct >= 60) return 'Good';
  return 'Needs Work';
};

exports.getMyCreditScore = catchAsync(async (req, res, next) => {
  const latest = await db.oneOrNone(
    'SELECT * FROM credit_scores WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [req.user.id]
  );

  if (!latest) {
    return res.status(200).json({ status: 'success', data: { score: null } });
  }

  res.status(200).json({
    status: 'success',
    data: {
      score: {
        value: latest.score,
        band: latest.score >= 740 ? 'GOOD' : latest.score >= 670 ? 'FAIR' : 'BUILDING',
        updatedAt: latest.recorded_at,
        factors: {
          paymentHistory: { pct: latest.payment_history_pct, grade: gradeFor(latest.payment_history_pct) },
          usage: { pct: latest.usage_pct, grade: gradeFor(100 - latest.usage_pct) },
          creditAgeYears: latest.credit_age_years,
          hardInquiries: latest.hard_inquiries,
        },
      },
    },
  });
});

// "What if I paid off my credit card balance?" style simulator — deterministic,
// simplified scoring heuristic for demo purposes only.
exports.simulate = catchAsync(async (req, res, next) => {
  const latest = await db.oneOrNone(
    'SELECT * FROM credit_scores WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [req.user.id]
  );
  if (!latest) return res.status(200).json({ status: 'success', data: { projectedScore: null } });

  const { scenario } = req.body; // e.g. 'payoff_credit_card'
  let delta = 0;
  if (scenario === 'payoff_credit_card') delta = 16;
  if (scenario === 'lower_utilization') delta = 9;
  if (scenario === 'on_time_payments_6mo') delta = 12;

  const projected = Math.min(850, latest.score + delta);
  res.status(200).json({ status: 'success', data: { currentScore: latest.score, projectedScore: projected, delta } });
});
