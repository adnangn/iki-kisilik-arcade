const randomIndex = length => crypto.getRandomValues(new Uint32Array(1))[0] % length;

export function shuffledIds(cards, pick = randomIndex) {
  const ids = cards.map(card => card.id);
  for (let index = ids.length - 1; index > 0; index--) {
    const target = pick(index + 1);
    if (!Number.isInteger(target) || target < 0 || target > index) throw new Error('Geçersiz rastgele seçim.');
    [ids[index], ids[target]] = [ids[target], ids[index]];
  }
  return ids;
}

// Generate the whole setup once, before submitting a transaction. Each trio
// has one tag and three different IDs; small collections can cycle their pool.
export function draftTriplets(cards, pick = randomIndex) {
  const byTag = new Map();
  for (const card of cards) {
    if (!byTag.has(card.etiket)) byTag.set(card.etiket, []);
    byTag.get(card.etiket).push(card);
  }
  const eligible = [...byTag].filter(([, group]) => group.length >= 3);
  if (!eligible.length) throw new Error('Bu koleksiyonda üçlü oluşturacak aynı etiketten kartlar yok.');
  let pools = new Map(eligible.map(([tag, group]) => [tag, shuffledIds(group, pick)]));
  return Array.from({ length: 11 }, () => {
    let choices = [...pools].filter(([, ids]) => ids.length >= 3);
    if (!choices.length) {
      pools = new Map(eligible.map(([tag, group]) => [tag, shuffledIds(group, pick)]));
      choices = [...pools];
    }
    const index = pick(choices.length);
    if (!Number.isInteger(index) || index < 0 || index >= choices.length) throw new Error('Geçersiz rastgele seçim.');
    const [etiket, ids] = choices[index];
    return { etiket, cards: ids.splice(0, 3) };
  });
}
