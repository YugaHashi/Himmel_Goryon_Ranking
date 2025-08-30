import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'; 

const supabase = createClient(
  'https://labmhtrafdslfwqmzgky.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhYm1odHJhZmRzbGZ3cW16Z2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTAzNzksImV4cCI6MjA2NTI2NjM3OX0.CviQ3lzngfvqDFwEtDw5cTRSEICWliunXngYCokhbNs'
);

async function loadRanking() {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01T00:00:00Z`;

  // ── コメント取得 ──
  const { data: comments, error: commentErr } = await supabase
    .from('find_comments')
    .select('menu_id')
    .gte('created_at', firstDay);
  if (commentErr) {
    console.error('コメント取得エラー:', commentErr);
    return;
  }

  // 件数カウント
  const counts = comments.reduce((acc, { menu_id }) => {
    acc[menu_id] = (acc[menu_id] || 0) + 1;
    return acc;
  }, {});
  const top3 = Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([id, cnt]) => ({ id: +id, cnt }));
  if (!top3.length) {
    console.warn('今月コメントがゼロ件です');
    return;
  }

  // ── メニュー詳細取得 ──
  const ids = top3.map(x => x.id);
  const { data: menus, error: menuErr } = await supabase
    .from('find_menus')
    .select('id, name_jp, description_jp, image_url')
    .in('id', ids);
  if (menuErr) {
    console.error('メニュー取得エラー:', menuErr);
    return;
  }

  const menuMap = Object.fromEntries(menus.map(m => [m.id, m]));
  top3.forEach((item, idx) => {
    const rank = idx + 1;
    const li   = document.querySelector(`.rank${rank}`);
    const menu = menuMap[item.id] || {};

    if (menu.image_url) {
      li.querySelector('.menu-img').src = menu.image_url;
    }
    li.querySelector('.popularity').innerHTML = `<span class="heart">💓</span> 人気：${item.cnt}人`;
    li.querySelector('.name').textContent       = menu.name_jp || '';
    const desc = menu.description_jp || '';
    const shortDesc = desc.includes('。') ? desc.split('。')[0] + '。' : desc;
    li.querySelector('.desc').textContent       = shortDesc;
  });
}

window.addEventListener('DOMContentLoaded', loadRanking);

// リアルタイム更新
supabase
  .from('find_comments')
  .on('INSERT', () => {
    loadRanking();
  })
  .subscribe();
