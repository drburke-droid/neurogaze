// ═══════════════════════════════════════════════════════════════
// Case library: presets + teaching cards
// ═══════════════════════════════════════════════════════════════
// Each case modifies a fresh engine state. `side` is 'R', 'L' or 'B'.
// `worst(side)` returns the gaze key (1–9, as the examiner sees the patient)
// where the defect is most obvious.
// Pupil cases (group 'pupil') also give the exam to start from (`exam`), and
// every case may script its key pupil test (`demo(side)`): timed steps that
// set the room light, penlight, near target and drops, with a caption.

import { MUSCLES } from './engine.js';

const eyesFor = (side) => (side === 'B' ? ['R', 'L'] : [side]);
const other = (eye) => (eye === 'R' ? 'L' : 'R');
// Gaze keys toward the patient's right / left for a given eye's abduction / adduction
const abductionKey = (eye) => (eye === 'R' ? 4 : 6);
const adductionKey = (eye) => (eye === 'R' ? 6 : 4);
const word = (eye) => (eye === 'L' ? 'left' : 'right');

export const SIDE_LABEL = { R: 'Right', L: 'Left', B: 'Bilateral' };
const PROPER = new Set(['brown', 'duane', 'mfs', 'mg', 'horner', 'adie']);

/** "Right sixth nerve palsy", "Left Duane syndrome", "Myasthenia gravis". */
export function sidedName(id, side) {
  const c = CASE_BY_ID[id];
  if (id === 'normal') return 'Normal';
  if (c.sides.length === 1 && c.sides[0] === 'B') return c.name;
  const name = PROPER.has(id) ? c.name : c.name.charAt(0).toLowerCase() + c.name.slice(1);
  return `${SIDE_LABEL[side]} ${name}`;
}

export const CASES = [
  {
    id: 'normal', name: 'Normal', sub: 'Healthy motility', sides: ['B'], mechanism: 'Normal',
    apply() {},
    worst: () => 7,
    card: {
      summary: 'Six muscles move each eye. Both eyes receive equal commands (Hering\'s law), and each agonist\'s antagonist relaxes (Sherrington\'s law).',
      look: 'Use the nine positions. In abduction the vertical recti do the elevating and depressing; in adduction the obliques take over. That is why each muscle is tested in its own diagnostic position. For the pupils, use the pupil exam under the face: dim the room, shine the penlight in one eye, or switch to a near target.',
      signs: ['LR abducts (CN VI)', 'MR adducts (CN III)', 'SR elevates in abduction, IO in adduction (CN III)', 'IR depresses in abduction, SO in adduction (CN IV)'],
      redFlags: '',
      notModelled: 'Torsion and saccade dynamics.',
    },
    demo: () => [
      { at: 0, exam: { room: 'bright' }, say: 'Bright room: pupils equal, about 4 mm.' },
      { at: 2.5, exam: { room: 'dim' }, say: 'Dim the room: both pupils dilate.' },
      { at: 5, exam: { pen: 'R' }, say: 'Light in the right eye: both pupils constrict (direct and consensual).' },
      { at: 8, exam: { pen: 'L' }, say: 'Swing to the left eye: both stay small. No RAPD.' },
      { at: 11, exam: { pen: 'off', near: true }, say: 'Near target: both constrict as the eyes converge.' },
      { at: 14.5, exam: { near: false }, say: 'Back to distance: both redilate.' },
    ],
  },
  {
    id: 'cn3', name: 'Third nerve palsy', sub: 'CN III · oculomotor', sides: ['R', 'L', 'B'], mechanism: 'Nerve palsy',
    apply(s, side) { for (const e of eyesFor(side)) { s.nerves[e][3] = 0; s.lid[e] = 0.55; s.pupil[e].para = 0; } },
    worst: (side) => adductionKey(side === 'L' ? 'L' : 'R'),
    card: {
      summary: 'Complete palsy leaves the eye "down and out": only the lateral rectus (CN VI) and superior oblique (CN IV) still work.',
      look: 'Ptosis, a dilated pupil that reacts to neither light nor near, and an eye that rests down and out. Adduction, elevation and depression are all limited. Switch the pupil to Normal (in the nerve panel) to see a pupil-sparing palsy.',
      signs: ['Ptosis (often complete)', 'Pupil may be dilated and unreactive', 'Exotropia with hypotropia', 'Limited adduction, elevation, depression'],
      redFlags: 'A pupil-involving or painful third nerve palsy is a posterior communicating artery aneurysm until proven otherwise and needs same-day imaging. Pupil-sparing palsies in vascular-risk patients are often microvascular but still need follow-up.',
      notModelled: 'The intorsion seen when a CN III-palsied eye attempts to look down, and aberrant regeneration.',
    },
    demo: (side) => {
      const e = side === 'L' ? 'L' : 'R', o = other(e);
      return [
        { at: 0, exam: { room: 'bright' }, say: `The ${word(e)} pupil is dilated.` },
        { at: 2.5, exam: { pen: e }, say: `Light in the ${word(e)} eye: no direct reaction, but the ${word(o)} pupil constricts, so the optic nerve works.` },
        { at: 6, exam: { pen: o }, say: `Light in the ${word(o)} eye: it constricts; the ${word(e)} pupil does not.` },
        { at: 9.5, exam: { pen: 'off', drop: 'pilo1' }, say: `Pilocarpine 1% in both eyes (sped up from 30 minutes): the ${word(e)} pupil constricts, so the iris sphincter itself works. A drug-blocked pupil would not.` },
      ];
    },
  },
  {
    id: 'cn4', name: 'Fourth nerve palsy', sub: 'CN IV · trochlear', sides: ['R', 'L', 'B'], mechanism: 'Nerve palsy',
    apply(s, side) { for (const e of eyesFor(side)) s.nerves[e][4] = 0; },
    worst: (side) => (side === 'L' ? 1 : 3),
    card: {
      summary: 'The superior oblique depresses the eye in adduction and intorts it. When it fails, the affected eye rides high.',
      look: 'Hypertropia of the affected eye that grows in gaze to the opposite side and in downgaze, largest down and in.',
      signs: ['Hypertropia worse on contralateral gaze', 'Worse on ipsilateral head tilt (Parks–Bielschowsky 3-step)', 'Head tilt to the opposite shoulder', 'Vertical / torsional diplopia, worse reading and on stairs'],
      redFlags: 'Commonest causes are trauma (often bilateral), decompensated congenital palsy and microvascular disease. Look for other neurological signs.',
      notModelled: 'Excyclotorsion and the head-tilt test.',
    },
  },
  {
    id: 'cn6', name: 'Sixth nerve palsy', sub: 'CN VI · abducens', sides: ['R', 'L', 'B'], mechanism: 'Nerve palsy',
    apply(s, side) { for (const e of eyesFor(side)) s.nerves[e][6] = 0; },
    worst: (side) => abductionKey(side === 'L' ? 'L' : 'R'),
    card: {
      summary: 'The lateral rectus cannot abduct the eye, so the unopposed medial rectus pulls it inward.',
      look: 'Esotropia that is largest in gaze toward the affected side and small or absent in the opposite direction (incomitant).',
      signs: ['Limited abduction', 'Esotropia worse at distance', 'Horizontal diplopia worse toward the affected side', 'Face turn toward the affected side'],
      redFlags: 'Check for papilloedema: raised intracranial pressure causes a "false-localising" sixth nerve palsy. Any child, or any adult without vascular risk factors, needs investigation.',
      notModelled: 'Saccade slowing in the paretic field.',
    },
  },
  {
    id: 'ino', name: 'Internuclear ophthalmoplegia', sub: 'INO · MLF lesion', sides: ['R', 'L', 'B'], mechanism: 'Supranuclear',
    apply(s, side) { for (const e of eyesFor(side)) s.mlf[e] = 1; },
    worst: (side) => adductionKey(side === 'L' ? 'L' : 'R'),
    card: {
      summary: 'A lesion of the medial longitudinal fasciculus disconnects the abducens nucleus from the opposite medial rectus subnucleus. The muscle itself is normal.',
      look: 'On looking away from the lesion, the eye on the lesion side fails to adduct while the abducting eye shows nystagmus. Switch the target to Near: convergence still works.',
      signs: ['Adduction deficit or slow adducting saccades', 'Abducting nystagmus of the fellow eye', 'Convergence usually spared', 'No deviation straight ahead (unilateral)'],
      redFlags: 'Young patient, often bilateral: think demyelination (MS). Older patient, unilateral: think brainstem stroke.',
      notModelled: 'Saccade velocity is shown only qualitatively.',
    },
  },
  {
    id: 'ted', name: 'Thyroid eye disease', sub: 'Graves orbitopathy', sides: ['R', 'L', 'B'], mechanism: 'Restrictive',
    apply(s, side) {
      for (const e of eyesFor(side)) {
        const k = side === 'B' && e === 'L' ? 0.6 : 1; // bilateral disease is usually asymmetric
        s.tight[e].IR = 0.7 * k; s.tight[e].MR = 0.45 * k;
      }
    },
    worst: (side) => (side === 'L' ? 9 : 7),
    card: {
      summary: 'Enlarged, fibrotic muscles act like tethers. The problem is restriction, not weakness: the eye cannot move away from the tight muscle.',
      look: 'The inferior rectus is affected most, then the medial rectus: limited elevation and abduction, with hypotropia and esotropia of the affected eye.',
      signs: ['Limited elevation (IR) and abduction (MR)', 'Hypotropia / esotropia', 'Lid retraction and proptosis', 'Positive forced duction test'],
      redFlags: 'Reduced vision, colour desaturation or an RAPD suggest compressive optic neuropathy, which is an emergency.',
      notModelled: 'Lid retraction, proptosis and raised intraocular pressure on upgaze.',
    },
  },
  {
    id: 'blowout', name: 'Orbital floor fracture', sub: 'Blowout · IR entrapment', sides: ['R', 'L'], mechanism: 'Restrictive',
    apply(s, side) { s.tight[side].IR = 0.85; s.muscles[side].IR = 0.75; },
    worst: () => 8,
    card: {
      summary: 'The inferior rectus or its surrounding tissue is trapped in the fracture, tethering the eye.',
      look: 'Elevation of the affected eye is markedly limited; depression is often mildly limited too. Vertical diplopia on upgaze.',
      signs: ['Limited elevation (± depression)', 'Infraorbital numbness (V2)', 'Enophthalmos', 'Positive forced duction test'],
      redFlags: 'A child with a "white-eyed" blowout, entrapment, nausea and bradycardia (oculocardiac reflex) needs urgent surgical review.',
      notModelled: 'Enophthalmos and globe displacement.',
    },
  },
  {
    id: 'brown', name: 'Brown syndrome', sub: 'SO tendon restriction', sides: ['R', 'L'], mechanism: 'Restrictive',
    apply(s, side) { s.brown[side] = 1; },
    worst: (side) => (side === 'L' ? 7 : 9),
    card: {
      summary: 'The superior oblique tendon cannot slide through the trochlea, so it tethers the eye when it should be elevating in adduction.',
      look: 'The eye cannot elevate when looking in toward the nose; elevation in abduction is near normal. Often little or no deviation straight ahead.',
      signs: ['Limited elevation in adduction', 'Near-normal elevation in abduction', 'V pattern', 'Positive forced duction test'],
      redFlags: 'Usually congenital. Acquired cases can follow trauma, surgery or inflammation (e.g. rheumatoid arthritis).',
      notModelled: 'Downshoot in adduction and the V pattern.',
    },
  },
  {
    id: 'duane', name: 'Duane syndrome', sub: 'Type I · congenital', sides: ['R', 'L'], mechanism: 'Congenital miswiring',
    apply(s, side) { s.duane[side] = 1; },
    worst: (side) => abductionKey(side),
    card: {
      summary: 'The abducens nucleus fails to develop and the lateral rectus is supplied by a branch of the third nerve instead.',
      look: 'No abduction of the affected eye. On adduction both horizontal recti fire together, pulling the globe back into the orbit (watch it retract when looking away from the affected side).',
      signs: ['Limited abduction', 'Globe retraction and narrowed lid fissure on adduction', 'Little or no deviation straight ahead, often a face turn', 'Diplopia is rare'],
      redFlags: 'Usually benign and congenital, more common in the left eye and in girls. Check for associated hearing, spine and limb anomalies.',
      notModelled: 'Lid fissure narrowing and up- or downshoots.',
    },
  },
  {
    id: 'cavsinus', name: 'Cavernous sinus syndrome', sub: 'CN III + IV + VI', sides: ['R', 'L'], mechanism: 'Nerve palsy',
    apply(s, side) { s.nerves[side][3] = 0; s.nerves[side][4] = 0; s.nerves[side][6] = 0; s.lid[side] = 0.55; s.pupil[side].para = 0; s.pupil[side].symp = 0; },
    worst: (side) => abductionKey(side),
    card: {
      summary: 'The third, fourth and sixth nerves (and V1/V2 and the ocular sympathetics) run together through the cavernous sinus and superior orbital fissure, so one lesion can stop them all.',
      look: 'Near-total ophthalmoplegia of one eye: it barely moves in any direction while the other eye moves normally.',
      signs: ['Ophthalmoplegia of one eye', 'Ptosis; pupil may be dilated or small (sympathetic involvement)', 'Numbness of the forehead (V1) ± cheek (V2)', 'Proptosis and chemosis if there is venous congestion'],
      redFlags: 'Needs urgent imaging. Consider carotid-cavernous fistula, cavernous sinus thrombosis (fever, sepsis), pituitary apoplexy (sudden headache, low vision), aneurysm, tumour and Tolosa–Hunt syndrome.',
      notModelled: 'Proptosis, chemosis and sensory loss. The pupil is shown fixed and mid-dilated, with both its parasympathetic and sympathetic supply lost; it can instead be dilated or small.',
    },
  },
  {
    id: 'mg', name: 'Myasthenia gravis', sub: 'Fatigable · any pattern', sides: ['B'], mechanism: 'Neuromuscular junction',
    apply(s) {
      s.muscles.R.SR = 0.75; s.muscles.R.MR = 0.85; s.muscles.L.LR = 0.8; s.muscles.L.IO = 0.85;
      s.lid.R = 0.2;
      s.fatigue = { severity: 0.75, f: { R: Object.fromEntries(MUSCLES.map((m) => [m, 0])), L: Object.fromEntries(MUSCLES.map((m) => [m, 0])) } };
    },
    worst: () => 8,
    card: {
      summary: 'Antibodies block the neuromuscular junction, so muscles weaken with use and recover with rest. Any combination of muscles can be involved.',
      look: 'Hold a gaze (try up) for 10–15 seconds and watch the eyes drift and the right lid droop as the muscles fatigue. Return to straight ahead to let them recover.',
      signs: ['Variable, fatigable diplopia', 'Ptosis that worsens on sustained upgaze', 'Can mimic any nerve palsy or INO', 'Pupils always normal'],
      redFlags: 'Difficulty swallowing, speaking or breathing means generalised disease and needs same-day assessment.',
      notModelled: 'Cogan\'s lid twitch and the ice-pack test.',
    },
  },
  {
    id: 'mfs', name: 'Miller Fisher syndrome', sub: 'GBS variant', sides: ['B'], mechanism: 'Nerve palsy',
    apply(s) {
      s.nerves.R[6] = 0.15; s.nerves.L[6] = 0.3;
      s.nerves.R[3] = 0.45; s.nerves.L[3] = 0.55;
      s.nerves.R[4] = 0.5; s.nerves.L[4] = 0.6;
    },
    worst: () => 4,
    card: {
      summary: 'A variant of Guillain–Barré syndrome with the triad of ophthalmoplegia, ataxia and areflexia, usually after an infection, with anti-GQ1b antibodies.',
      look: 'Bilateral, often asymmetric limitation of eye movements. Abduction is frequently affected first.',
      signs: ['Bilateral ophthalmoplegia', 'Ataxia', 'Areflexia', 'Ptosis in about half'],
      redFlags: 'Watch for progression to limb weakness or respiratory involvement (overlap with Guillain–Barré).',
      notModelled: 'Ptosis and the pupil.',
    },
  },
  {
    id: 'skew', name: 'Skew deviation', sub: 'Wallenberg · lateral medulla', sides: ['R', 'L'], mechanism: 'Supranuclear',
    apply(s, side) { s.skew[side] = -2.5; s.skew[other(side)] = 2.5; s.pupil[side].symp = 0; s.lid[side] = 0.25; },
    worst: () => 5,
    card: {
      summary: 'A lateral medullary (Wallenberg) stroke disrupts vestibular input to the vertical gaze system. This is a supranuclear sign, not a muscle palsy.',
      look: 'The eye on the side of the lesion sits lower. The vertical misalignment is about the same in every direction of gaze, and ductions are full. The same side shows a Horner syndrome: a smaller pupil and a mild ptosis.',
      signs: ['Ipsilesional hypotropia, roughly comitant', 'Ocular tilt reaction: head tilt and torsion toward the lesion', 'Ipsilateral Horner syndrome and facial numbness', 'Contralateral loss of pain and temperature in the body'],
      redFlags: 'Acute vertical diplopia with vertigo is a stroke until proven otherwise. Skew deviation is one of the HINTS signs.',
      notModelled: 'Torsion, head tilt, nystagmus and ocular lateropulsion.',
    },
  },

  // ── Pupils ──────────────────────────────────────────────────────
  {
    id: 'rapd', name: 'Relative afferent pupillary defect', sub: 'RAPD · optic nerve', sides: ['R', 'L'], mechanism: 'Afferent defect', group: 'pupil',
    apply(s, side) { s.pupil[side].afferent = 0.13; },
    worst: () => 5,
    exam: { room: 'dim', pen: 'swing' },
    card: {
      summary: 'Damage to one optic nerve (or a large area of retina) weakens the light signal that eye sends to the midbrain. Each pupil is driven by the light signal from both eyes, so the pupils stay equal in size.',
      look: 'Swinging flashlight test in a dim room: when the light moves to the healthy eye both pupils constrict; when it swings to the affected eye both pupils dilate, because that eye senses less light.',
      signs: ['Pupils equal in size', 'Both dilate when the light swings to the affected eye', 'Reduced vision, colour desaturation or a field defect in that eye', 'Graded with neutral density filters (log units)'],
      redFlags: 'A new RAPD with vision loss needs same-day assessment: optic neuritis, ischaemic optic neuropathy (giant cell arteritis in older patients), compression, retinal detachment or retinal artery occlusion.',
      notModelled: 'Grading with filters, and the larger pupillary escape of the affected eye.',
    },
    demo: (side) => {
      const b = side, g = other(side);
      return [
        { at: 0, exam: { room: 'dim' }, say: 'Dim room, patient looking at a distant target. The pupils are equal.' },
        { at: 2.5, exam: { pen: g }, say: `Light in the ${word(g)} eye: both pupils constrict.` },
        { at: 5.5, exam: { pen: b }, say: `Swing to the ${word(b)} eye: both pupils dilate. A ${word(b)} RAPD.` },
        { at: 8.5, exam: { pen: g }, say: `Back to the ${word(g)} eye: both constrict again.` },
        { at: 11.5, exam: { pen: 'swing' }, say: 'Keep swinging, about 2 to 3 seconds on each eye.' },
      ];
    },
  },
  {
    id: 'horner', name: 'Horner syndrome', sub: 'Sympathetic · miosis, ptosis', sides: ['R', 'L'], mechanism: 'Sympathetic', group: 'pupil',
    apply(s, side) { s.pupil[side].symp = 0; s.lid[side] = 0.25; },
    worst: () => 5,
    exam: { room: 'dim' },
    card: {
      summary: 'The sympathetic pathway runs from the hypothalamus down to the upper chest and back up along the carotid artery to the eye. Interrupting it anywhere weakens the iris dilator and Müller\'s muscle of the upper lid.',
      look: 'A smaller pupil and a mild ptosis on the same side. The difference between the pupils is largest in dim light, and the small pupil is slow to dilate when the lights go down (dilation lag). Apraclonidine drops reverse it.',
      signs: ['Miosis; anisocoria greater in dim light', 'Mild ptosis (1–2 mm) and a slightly raised lower lid', 'Dilation lag', 'Reduced sweating on that side (pre-ganglionic lesions)', 'Apraclonidine reverses the anisocoria; cocaine drops fail to dilate'],
      redFlags: 'A new, painful Horner syndrome is a carotid artery dissection until proven otherwise and needs same-day imaging. Also consider an apical lung (Pancoast) tumour, and neuroblastoma in a child.',
      notModelled: 'Lower lid elevation, anhidrosis, a lighter iris in congenital cases, and localisation with hydroxyamphetamine.',
    },
    demo: (side) => [
      { at: 0, exam: { room: 'bright' }, say: `Bright room: the ${word(side)} pupil is a little smaller, with a mild ptosis.` },
      { at: 3, exam: { room: 'dim' }, say: `Lights down: the ${word(side)} pupil dilates slowly (dilation lag).` },
      { at: 8, say: 'In dim light the difference between the pupils is largest.' },
      { at: 11, exam: { drop: 'apra' }, say: `Apraclonidine 0.5% in both eyes (sped up from 45 minutes): the ${word(side)} pupil dilates and its lid lifts. The anisocoria reverses.` },
    ],
  },
  {
    id: 'adie', name: 'Adie tonic pupil', sub: 'Ciliary ganglion · light-near', sides: ['R', 'L'], mechanism: 'Parasympathetic', group: 'pupil',
    apply(s, side) { s.pupil[side].tonic = 1; s.pupil[side].tone = 0.4; },
    worst: () => 5,
    exam: { room: 'bright' },
    card: {
      summary: 'Damage to the ciliary ganglion behind the eye, often after a viral illness, cuts the nerve supply to the iris sphincter. Fibres meant for focusing (accommodation) regrow into the sphincter instead.',
      look: 'A larger pupil that barely reacts to light, but constricts slowly and strongly to a near target, then redilates slowly (tonic). Dilute pilocarpine constricts it but hardly affects the other eye.',
      signs: ['Larger pupil; anisocoria greater in bright light', 'Poor or absent light reaction, with segmental (vermiform) iris movements at the slit lamp', 'Slow, sustained near response (light-near dissociation)', 'Constricts to dilute pilocarpine 0.1% (denervation supersensitivity)', 'Reduced knee and ankle reflexes (Holmes–Adie syndrome)'],
      redFlags: 'Usually benign, most often in women aged 20 to 40. A dilated pupil with ptosis or limited eye movements is a third nerve palsy, not an Adie pupil.',
      notModelled: 'Segmental iris palsy, blurred near vision from weak accommodation, and the slow shrinking of the pupil over the years.',
    },
    demo: (side) => [
      { at: 0, exam: { room: 'bright' }, say: `Bright room: the ${word(side)} pupil is larger.` },
      { at: 2.5, exam: { pen: side }, say: `Light in the ${word(side)} eye: little or no reaction.` },
      { at: 5.5, exam: { pen: 'off', near: true }, say: `Near target: the ${word(side)} pupil constricts slowly but strongly.` },
      { at: 12, exam: { near: false }, say: 'Back to distance: it stays small and redilates slowly (tonic).' },
      { at: 19, exam: { drop: 'pilo01' }, say: `Pilocarpine 0.1% in both eyes (sped up from 30 minutes): only the ${word(side)} pupil constricts.` },
    ],
  },
  {
    id: 'argyll', name: 'Argyll Robertson pupils', sub: 'Small, irregular · light-near', sides: ['B'], mechanism: 'Midbrain', group: 'pupil',
    apply(s) {
      for (const e of ['R', 'L']) Object.assign(s.pupil[e], { light: 0, tone: e === 'R' ? 1.4 : 1.6, irregular: 1 });
    },
    worst: () => 5,
    exam: { room: 'bright' },
    card: {
      summary: 'A lesion near the pretectal area of the dorsal midbrain interrupts the light reflex on its way to the Edinger–Westphal nuclei. The near pathway runs more ventrally and is spared.',
      look: 'Both pupils are small and irregular and do not react to light, yet constrict briskly to a near target: light-near dissociation.',
      signs: ['Small, irregular, often unequal pupils', 'No light reaction', 'Brisk near response', 'Dilate poorly with dilating drops'],
      redFlags: 'Test for syphilis (treponemal serology). Light-near dissociation also occurs with Adie pupils, dorsal midbrain (Parinaud) syndrome, diabetes and severe bilateral optic nerve disease.',
      notModelled: 'Iris atrophy and the poor response to dilating drops.',
    },
    demo: () => [
      { at: 0, exam: { room: 'bright' }, say: 'Both pupils are small and irregular.' },
      { at: 2.5, exam: { pen: 'R' }, say: 'Light in the right eye: no reaction in either pupil.' },
      { at: 5, exam: { pen: 'L' }, say: 'Light in the left eye: still no reaction.' },
      { at: 7.5, exam: { pen: 'off', near: true }, say: 'Near target: both constrict briskly. Light-near dissociation.' },
      { at: 11, exam: { near: false }, say: 'Back to distance.' },
    ],
  },
  {
    id: 'pharm', name: 'Pharmacological dilation', sub: 'Anticholinergic drug', sides: ['R', 'L'], mechanism: 'Pharmacological', group: 'pupil',
    apply(s, side) { s.pupil[side].block = 1; },
    worst: () => 5,
    exam: { room: 'bright' },
    card: {
      summary: 'An anticholinergic drug blocks the receptors of the iris sphincter. Common sources are scopolamine travel-sickness patches, ipratropium nebulisers, dilating eye drops, and plants such as jimsonweed and angel\'s trumpet.',
      look: 'A very large pupil that reacts to neither light nor near, with normal lids and eye movements. Pilocarpine 1% constricts a third nerve palsy pupil, but not a drug-blocked one.',
      signs: ['Large pupil, often 8 to 9 mm', 'No light or near reaction', 'No ptosis or limited eye movements', 'Does not constrict to pilocarpine 1%'],
      redFlags: 'With ptosis, double vision or headache, treat it as a third nerve palsy. Ask about patches, inhalers, eye drops, gardening, and handling other people\'s medicines.',
      notModelled: 'Dilation by adrenergic drugs such as phenylephrine, which leaves the pupil reactive and often blanches the eye.',
    },
    demo: (side) => [
      { at: 0, exam: { room: 'bright' }, say: `The ${word(side)} pupil is very large; lids and eye movements are normal.` },
      { at: 2.5, exam: { pen: side }, say: `Light in the ${word(side)} eye: it does not react; the ${word(other(side))} pupil constricts.` },
      { at: 5.5, exam: { pen: 'off', near: true }, say: `Near target: the ${word(side)} pupil still does not react.` },
      { at: 8.5, exam: { near: false, drop: 'pilo1' }, say: `Pilocarpine 1% in both eyes (sped up from 30 minutes): the ${word(other(side))} pupil constricts, the ${word(side)} pupil does not. Its receptors are blocked.` },
    ],
  },
  {
    id: 'physaniso', name: 'Physiological anisocoria', sub: 'Normal variant', sides: ['B'], mechanism: 'Normal variant', group: 'pupil',
    apply(s) { s.pupil.L.offset = -0.8; },
    worst: () => 5,
    exam: { room: 'bright' },
    card: {
      summary: 'About one person in five has pupils that differ by up to 1 mm. The nerves and muscles are normal, so the difference stays about the same in bright and dim light.',
      look: 'Switch the room light between Bright and Dim: the difference between the pupils barely changes, and both react briskly to light and near. Compare Horner syndrome (larger difference in dim light) with a third nerve palsy or Adie pupil (larger difference in bright light).',
      signs: ['Anisocoria usually 1 mm or less', 'Similar in bright and dim light', 'Brisk light and near reactions, no dilation lag', 'No ptosis; often visible in old photographs'],
      redFlags: 'New anisocoria with ptosis, double vision, pain or headache is not physiological.',
      notModelled: 'Day-to-day variation, including the pupils switching which is larger.',
    },
    demo: () => [
      { at: 0, exam: { room: 'bright' }, say: 'Bright room: the left pupil is about 0.8 mm smaller.' },
      { at: 3, exam: { room: 'dim' }, say: 'Dim room: the difference is about the same, and both dilate promptly.' },
      { at: 6.5, exam: { pen: 'R' }, say: 'Light in either eye: both pupils constrict briskly.' },
      { at: 9.5, exam: { pen: 'off' }, say: 'No ptosis and no dilation lag: a normal variant.' },
    ],
  },
];


// Usual causes, shown with suggested diagnoses in the motility chart
export const CAUSES = {
  normal: [],
  cn3: ['Microvascular ischaemia (diabetes, hypertension): usually pupil-sparing', 'Posterior communicating artery aneurysm: pupil involved, painful', 'Trauma', 'Tumour or uncal herniation', 'Giant cell arteritis (age over 50)'],
  cn4: ['Head trauma (often bilateral)', 'Decompensated congenital palsy (check old photos, large vertical fusional range)', 'Microvascular ischaemia', 'Rarely tumour or demyelination'],
  cn6: ['Microvascular ischaemia (diabetes, hypertension)', 'Raised intracranial pressure (check for papilloedema)', 'Trauma', 'Skull base tumour, petrous apex disease', 'Demyelination in younger adults; post-viral in children'],
  cavsinus: ['Carotid-cavernous fistula', 'Cavernous sinus thrombosis', 'Pituitary apoplexy or tumour', 'Intracavernous aneurysm', 'Tolosa–Hunt syndrome'],
  ino: ['Multiple sclerosis (young, often bilateral)', 'Brainstem stroke (older, usually unilateral)', 'Less often tumour, trauma or Wernicke encephalopathy'],
  ted: ['Graves disease (hyperthyroid)', 'Also euthyroid or hypothyroid autoimmune thyroid disease', 'Risk raised by smoking and radioiodine treatment'],
  blowout: ['Blunt orbital trauma (ball, fist, fall)'],
  brown: ['Congenital tendon sheath abnormality', 'Acquired: trauma or surgery near the trochlea, inflammation (e.g. rheumatoid arthritis, sinusitis)'],
  duane: ['Congenital cranial dysinnervation (absent abducens nucleus)', 'Can be associated with hearing, spine or limb anomalies'],
  mg: ['Autoimmune acetylcholine-receptor or MuSK antibodies', 'Thymoma in some patients'],
  mfs: ['Post-infectious anti-GQ1b antibody syndrome (often after Campylobacter or a viral illness)'],
  skew: ['Brainstem or cerebellar stroke (e.g. lateral medullary)', 'Demyelination, tumour or trauma affecting the vestibular pathways'],
  rapd: ['Optic neuritis (often with pain on eye movement)', 'Ischaemic optic neuropathy, including giant cell arteritis', 'Compression of the optic nerve (tumour, thyroid eye disease)', 'Advanced asymmetric glaucoma', 'Large retinal detachment, or retinal artery or vein occlusion'],
  horner: ['Central: brainstem stroke (Wallenberg), demyelination', 'Pre-ganglionic: apical lung (Pancoast) tumour, neck or chest surgery or trauma; neuroblastoma in children', 'Post-ganglionic: carotid artery dissection, cavernous sinus lesions, cluster headache', 'Congenital (often birth trauma), with a lighter iris on that side'],
  adie: ['Idiopathic, often after a viral illness', 'Orbital trauma or surgery', 'Less often herpes zoster, diabetes or other neuropathies'],
  argyll: ['Neurosyphilis', 'Diabetes', 'Less often Lyme disease, sarcoidosis, chronic alcohol use or multiple sclerosis'],
  pharm: ['Scopolamine travel-sickness patch', 'Ipratropium inhaler or nebuliser', 'Dilating eye drops (atropine, cyclopentolate, tropicamide)', 'Plants: jimsonweed, angel\'s trumpet, deadly nightshade'],
  physaniso: ['Normal variant'],
};

export const CASE_BY_ID = Object.fromEntries(CASES.map((c) => [c.id, c]));
