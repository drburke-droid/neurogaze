// ═══════════════════════════════════════════════════════════════
// Case library: presets + teaching cards
// ═══════════════════════════════════════════════════════════════
// Each case modifies a fresh engine state. `side` is 'R', 'L' or 'B'.
// `worst(side)` returns the gaze key (1–9, as the examiner sees the patient)
// where the defect is most obvious.

import { MUSCLES } from './engine.js';

const eyesFor = (side) => (side === 'B' ? ['R', 'L'] : [side]);
const other = (eye) => (eye === 'R' ? 'L' : 'R');
// Gaze keys toward the patient's right / left for a given eye's abduction / adduction
const abductionKey = (eye) => (eye === 'R' ? 4 : 6);
const adductionKey = (eye) => (eye === 'R' ? 6 : 4);

export const SIDE_LABEL = { R: 'Right', L: 'Left', B: 'Bilateral' };
const PROPER = new Set(['brown', 'duane', 'mfs', 'mg']);

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
      look: 'Use the nine positions. In abduction the vertical recti do the elevating and depressing; in adduction the obliques take over. That is why each muscle is tested in its own diagnostic position.',
      signs: ['LR abducts (CN VI)', 'MR adducts (CN III)', 'SR elevates in abduction, IO in adduction (CN III)', 'IR depresses in abduction, SO in adduction (CN IV)'],
      redFlags: '',
      notModelled: 'Torsion, eyelids, pupils, saccade dynamics.',
    },
  },
  {
    id: 'cn3', name: 'Third nerve palsy', sub: 'CN III · oculomotor', sides: ['R', 'L', 'B'], mechanism: 'Nerve palsy',
    apply(s, side) { for (const e of eyesFor(side)) s.nerves[e][3] = 0; },
    worst: (side) => adductionKey(side === 'L' ? 'L' : 'R'),
    card: {
      summary: 'Complete palsy leaves the eye "down and out": only the lateral rectus (CN VI) and superior oblique (CN IV) still work.',
      look: 'Exotropia and hypotropia in primary position. Adduction, elevation and depression are all limited.',
      signs: ['Ptosis (often complete)', 'Pupil may be dilated and unreactive', 'Exotropia with hypotropia', 'Limited adduction, elevation, depression'],
      redFlags: 'A pupil-involving or painful third nerve palsy is a posterior communicating artery aneurysm until proven otherwise and needs same-day imaging. Pupil-sparing palsies in vascular-risk patients are often microvascular but still need follow-up.',
      notModelled: 'Ptosis, the pupil, and the intorsion seen when a CN III-palsied eye attempts to look down.',
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
    apply(s, side) { s.nerves[side][3] = 0; s.nerves[side][4] = 0; s.nerves[side][6] = 0; },
    worst: (side) => abductionKey(side),
    card: {
      summary: 'The third, fourth and sixth nerves (and V1/V2 and the ocular sympathetics) run together through the cavernous sinus and superior orbital fissure, so one lesion can stop them all.',
      look: 'Near-total ophthalmoplegia of one eye: it barely moves in any direction while the other eye moves normally.',
      signs: ['Ophthalmoplegia of one eye', 'Ptosis; pupil may be dilated or small (sympathetic involvement)', 'Numbness of the forehead (V1) ± cheek (V2)', 'Proptosis and chemosis if there is venous congestion'],
      redFlags: 'Needs urgent imaging. Consider carotid-cavernous fistula, cavernous sinus thrombosis (fever, sepsis), pituitary apoplexy (sudden headache, low vision), aneurysm, tumour and Tolosa–Hunt syndrome.',
      notModelled: 'Ptosis, the pupil, proptosis and sensory loss.',
    },
  },
  {
    id: 'mg', name: 'Myasthenia gravis', sub: 'Fatigable · any pattern', sides: ['B'], mechanism: 'Neuromuscular junction',
    apply(s) {
      s.muscles.R.SR = 0.75; s.muscles.R.MR = 0.85; s.muscles.L.LR = 0.8; s.muscles.L.IO = 0.85;
      s.fatigue = { severity: 0.75, f: { R: Object.fromEntries(MUSCLES.map((m) => [m, 0])), L: Object.fromEntries(MUSCLES.map((m) => [m, 0])) } };
    },
    worst: () => 8,
    card: {
      summary: 'Antibodies block the neuromuscular junction, so muscles weaken with use and recover with rest. Any combination of muscles can be involved.',
      look: 'Hold a gaze (try up) for 10–15 seconds and watch the eyes drift as the muscles fatigue. Return to straight ahead to let them recover.',
      signs: ['Variable, fatigable diplopia', 'Ptosis that worsens on sustained upgaze', 'Can mimic any nerve palsy or INO', 'Pupils always normal'],
      redFlags: 'Difficulty swallowing, speaking or breathing means generalised disease and needs same-day assessment.',
      notModelled: 'Ptosis, Cogan\'s lid twitch and the ice-pack test.',
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
    apply(s, side) { s.skew[side] = -2.5; s.skew[other(side)] = 2.5; },
    worst: () => 5,
    card: {
      summary: 'A lateral medullary (Wallenberg) stroke disrupts vestibular input to the vertical gaze system. This is a supranuclear sign, not a muscle palsy.',
      look: 'The eye on the side of the lesion sits lower. The vertical misalignment is about the same in every direction of gaze, and ductions are full.',
      signs: ['Ipsilesional hypotropia, roughly comitant', 'Ocular tilt reaction: head tilt and torsion toward the lesion', 'Ipsilateral Horner syndrome and facial numbness', 'Contralateral loss of pain and temperature in the body'],
      redFlags: 'Acute vertical diplopia with vertigo is a stroke until proven otherwise. Skew deviation is one of the HINTS signs.',
      notModelled: 'Torsion, head tilt, nystagmus and ocular lateropulsion.',
    },
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
};

export const CASE_BY_ID = Object.fromEntries(CASES.map((c) => [c.id, c]));
