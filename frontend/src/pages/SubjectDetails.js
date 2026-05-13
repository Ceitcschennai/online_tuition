import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/SubjectDetails.css';
import {
  FaArrowLeft, FaClock, FaBook, FaCalendarAlt,
  FaChevronDown, FaChevronUp, FaGraduationCap, FaStar
} from 'react-icons/fa';

const subjectData = {
  English: {
    color: '#2563eb',
    accent: '#dbeafe',
    emoji: '📖',
    description: 'Develop language proficiency through literature, grammar, writing, and communication skills.',
    totalHours: 180,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 60,
        units: [
          { unit: 'Unit 1', title: 'Prose – Short Stories', topics: ['The Model Millionaire', 'Reading Comprehension', 'Vocabulary Building'], hours: 15 },
          { unit: 'Unit 2', title: 'Poetry', topics: ['Figurative Language', 'Rhyme & Metre', 'Poem Analysis'], hours: 12 },
          { unit: 'Unit 3', title: 'Grammar', topics: ['Tenses', 'Voice – Active & Passive', 'Reported Speech'], hours: 18 },
          { unit: 'Unit 4', title: 'Writing Skills', topics: ['Essay Writing', 'Letter Writing', 'Report Writing'], hours: 15 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 65,
        units: [
          { unit: 'Unit 5', title: 'Novel Study', topics: ['Character Analysis', 'Plot Structure', 'Themes & Symbolism'], hours: 20 },
          { unit: 'Unit 6', title: 'Drama', topics: ['Play Reading', 'Dialogue Writing', 'Stage Directions'], hours: 15 },
          { unit: 'Unit 7', title: 'Advanced Grammar', topics: ['Conditionals', 'Clauses', 'Prepositions'], hours: 15 },
          { unit: 'Unit 8', title: 'Speaking & Listening', topics: ['Debate', 'Group Discussion', 'Oral Presentations'], hours: 15 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 55,
        units: [
          { unit: 'Unit 9', title: 'Revision & Practice', topics: ['Previous Year Papers', 'Mock Tests', 'Error Correction'], hours: 25 },
          { unit: 'Unit 10', title: 'Creative Writing', topics: ['Story Writing', 'Descriptive Writing', 'Diary Entry'], hours: 15 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Time Management', 'Answer Techniques', 'Model Answers'], hours: 15 },
        ]
      }
    ]
  },

  Tamil: {
    color: '#dc2626',
    accent: '#fee2e2',
    emoji: '🌺',
    description: 'தமிழ் மொழி இலக்கியம், இலக்கணம் மற்றும் எழுத்துத் திறன்களை வளர்க்கும் பாடநெறி.',
    totalHours: 180,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 60,
        units: [
          { unit: 'Unit 1', title: 'உரைநடை', topics: ['சிறுகதை', 'பொதுவான வாசிப்பு', 'சொல்வளம்'], hours: 15 },
          { unit: 'Unit 2', title: 'கவிதை', topics: ['இலக்கியம்', 'யாப்பிலக்கணம்', 'கவிதை ஆய்வு'], hours: 12 },
          { unit: 'Unit 3', title: 'இலக்கணம்', topics: ['பெயர்ச்சொல்', 'வினைச்சொல்', 'வேற்றுமை'], hours: 18 },
          { unit: 'Unit 4', title: 'எழுத்துத் திறன்', topics: ['கட்டுரை', 'கடிதம்', 'சுருக்கம்'], hours: 15 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 65,
        units: [
          { unit: 'Unit 5', title: 'இலக்கியம்', topics: ['சங்க இலக்கியம்', 'பக்தி இலக்கியம்', 'நவீன இலக்கியம்'], hours: 20 },
          { unit: 'Unit 6', title: 'நாடகம்', topics: ['நாடக வாசிப்பு', 'வசன எழுத்து', 'கதாபாத்திர ஆய்வு'], hours: 15 },
          { unit: 'Unit 7', title: 'உயர்நிலை இலக்கணம்', topics: ['அணி இலக்கணம்', 'தொடர் இலக்கணம்', 'மரபு'], hours: 15 },
          { unit: 'Unit 8', title: 'பேச்சுத் திறன்', topics: ['விவாதம்', 'குழு உரையாடல்', 'நேர்முக பேச்சு'], hours: 15 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 55,
        units: [
          { unit: 'Unit 9', title: 'மறுபார்வை', topics: ['முந்தைய ஆண்டு வினாத்தாள்கள்', 'பயிற்சி தேர்வு'], hours: 25 },
          { unit: 'Unit 10', title: 'படைப்பு எழுத்து', topics: ['கவிதை எழுத்து', 'கதை எழுத்து'], hours: 15 },
          { unit: 'Unit 11', title: 'தேர்வு தயாரிப்பு', topics: ['நேர மேலாண்மை', 'விடை நுட்பங்கள்'], hours: 15 },
        ]
      }
    ]
  },

  Maths: {
    color: '#7c3aed',
    accent: '#ede9fe',
    emoji: '📐',
    description: 'Build strong mathematical foundations in algebra, geometry, calculus, and statistics.',
    totalHours: 200,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 70,
        units: [
          { unit: 'Unit 1', title: 'Number Systems', topics: ['Real Numbers', 'Surds & Indices', 'Logarithms'], hours: 18 },
          { unit: 'Unit 2', title: 'Algebra', topics: ['Polynomials', 'Quadratic Equations', 'Progressions'], hours: 20 },
          { unit: 'Unit 3', title: 'Geometry', topics: ['Triangles', 'Circles', 'Constructions'], hours: 18 },
          { unit: 'Unit 4', title: 'Trigonometry', topics: ['Ratios', 'Identities', 'Heights & Distances'], hours: 14 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 75,
        units: [
          { unit: 'Unit 5', title: 'Co-ordinate Geometry', topics: ['Distance Formula', 'Section Formula', 'Area of Triangle'], hours: 20 },
          { unit: 'Unit 6', title: 'Statistics & Probability', topics: ['Mean/Median/Mode', 'Probability', 'Data Interpretation'], hours: 18 },
          { unit: 'Unit 7', title: 'Mensuration', topics: ['Surface Area', 'Volume', '3D Shapes'], hours: 20 },
          { unit: 'Unit 8', title: 'Calculus Basics', topics: ['Limits', 'Differentiation', 'Integration'], hours: 17 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 55,
        units: [
          { unit: 'Unit 9', title: 'Matrices & Determinants', topics: ['Matrix Operations', 'Determinants', 'Inverse Matrix'], hours: 20 },
          { unit: 'Unit 10', title: 'Problem Solving', topics: ['Word Problems', 'Application Questions', 'Olympiad Practice'], hours: 20 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Previous Papers', 'Speed Tests', 'Formula Revision'], hours: 15 },
        ]
      }
    ]
  },

  Science: {
    color: '#059669',
    accent: '#d1fae5',
    emoji: '🔬',
    description: 'Explore the wonders of the natural world through Physics, Chemistry, and Biology concepts.',
    totalHours: 180,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 60,
        units: [
          { unit: 'Unit 1', title: 'Physics Basics', topics: ['Motion', 'Force & Laws of Motion', 'Gravitation'], hours: 18 },
          { unit: 'Unit 2', title: 'Chemistry Basics', topics: ['Matter & Its Nature', 'Atoms & Molecules', 'Chemical Reactions'], hours: 16 },
          { unit: 'Unit 3', title: 'Biology Basics', topics: ['Cell Structure', 'Tissues', 'Life Processes'], hours: 16 },
          { unit: 'Unit 4', title: 'Practical Work', topics: ['Lab Safety', 'Experiments', 'Observation Recording'], hours: 10 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 65,
        units: [
          { unit: 'Unit 5', title: 'Sound & Light', topics: ['Wave Motion', 'Reflection & Refraction', 'Optical Instruments'], hours: 20 },
          { unit: 'Unit 6', title: 'Electricity', topics: ['Current & Voltage', 'Ohm\'s Law', 'Circuits'], hours: 18 },
          { unit: 'Unit 7', title: 'Ecology', topics: ['Ecosystems', 'Food Chains', 'Environmental Issues'], hours: 12 },
          { unit: 'Unit 8', title: 'Human Body', topics: ['Digestive System', 'Respiratory System', 'Nervous System'], hours: 15 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 55,
        units: [
          { unit: 'Unit 9', title: 'Heredity & Evolution', topics: ['Genetics', 'Natural Selection', 'Variation'], hours: 18 },
          { unit: 'Unit 10', title: 'Natural Resources', topics: ['Conservation', 'Pollution', 'Sustainable Development'], hours: 15 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Diagrams Practice', 'Numerical Problems', 'MCQ Review'], hours: 22 },
        ]
      }
    ]
  },

  Social: {
    color: '#d97706',
    accent: '#fef3c7',
    emoji: '🌍',
    description: 'Understand history, geography, civics, and economics to become an informed global citizen.',
    totalHours: 160,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 55,
        units: [
          { unit: 'Unit 1', title: 'History – Ancient Civilizations', topics: ['Indus Valley', 'Vedic Period', 'Mauryan Empire'], hours: 18 },
          { unit: 'Unit 2', title: 'Geography – Physical Features', topics: ['Landforms', 'Climate', 'Drainage Systems'], hours: 18 },
          { unit: 'Unit 3', title: 'Civics – Constitution', topics: ['Fundamental Rights', 'Duties', 'Government Structure'], hours: 12 },
          { unit: 'Unit 4', title: 'Map Work', topics: ['Map Reading', 'Latitude & Longitude', 'India Map'], hours: 7 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 60,
        units: [
          { unit: 'Unit 5', title: 'History – Medieval India', topics: ['Delhi Sultanate', 'Mughal Empire', 'Bhakti Movement'], hours: 20 },
          { unit: 'Unit 6', title: 'Geography – Human Geography', topics: ['Population', 'Agriculture', 'Industries'], hours: 18 },
          { unit: 'Unit 7', title: 'Economics – Basic Concepts', topics: ['Demand & Supply', 'Market', 'Banking'], hours: 12 },
          { unit: 'Unit 8', title: 'Civics – Parliament', topics: ['Lok Sabha', 'Rajya Sabha', 'Election Process'], hours: 10 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 45,
        units: [
          { unit: 'Unit 9', title: 'Modern History', topics: ['British Rule', 'Freedom Movement', 'Partition & Independence'], hours: 18 },
          { unit: 'Unit 10', title: 'Contemporary India', topics: ['Foreign Policy', 'Economic Reforms', 'Social Issues'], hours: 12 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Timeline Practice', 'Map Exercises', 'Essay Writing'], hours: 15 },
        ]
      }
    ]
  },

  Physics: {
    color: '#0891b2',
    accent: '#cffafe',
    emoji: '⚛️',
    description: 'Discover the fundamental laws governing the universe — from mechanics to modern physics.',
    totalHours: 210,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 72,
        units: [
          { unit: 'Unit 1', title: 'Laws of Motion', topics: ['Newton\'s Laws', 'Friction', 'Circular Motion'], hours: 20 },
          { unit: 'Unit 2', title: 'Work, Energy & Power', topics: ['Work-Energy Theorem', 'Conservation of Energy', 'Collisions'], hours: 18 },
          { unit: 'Unit 3', title: 'Gravitation', topics: ['Kepler\'s Laws', 'Satellite Motion', 'Escape Velocity'], hours: 18 },
          { unit: 'Unit 4', title: 'Properties of Matter', topics: ['Elasticity', 'Fluid Mechanics', 'Surface Tension'], hours: 16 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 78,
        units: [
          { unit: 'Unit 5', title: 'Thermodynamics', topics: ['Laws of Thermodynamics', 'Heat Engines', 'Entropy'], hours: 22 },
          { unit: 'Unit 6', title: 'Waves & Oscillations', topics: ['SHM', 'Wave Motion', 'Sound Waves'], hours: 20 },
          { unit: 'Unit 7', title: 'Optics', topics: ['Ray Optics', 'Wave Optics', 'Optical Instruments'], hours: 20 },
          { unit: 'Unit 8', title: 'Electrostatics', topics: ['Coulomb\'s Law', 'Electric Field', 'Capacitance'], hours: 16 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 60,
        units: [
          { unit: 'Unit 9', title: 'Current Electricity & Magnetism', topics: ['Circuits', 'Magnetic Effects', 'Electromagnetic Induction'], hours: 22 },
          { unit: 'Unit 10', title: 'Modern Physics', topics: ['Photoelectric Effect', 'Atomic Models', 'Nuclear Physics'], hours: 22 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Derivations', 'Numerical Practice', 'Diagram Revision'], hours: 16 },
        ]
      }
    ]
  },

  Chemistry: {
    color: '#be185d',
    accent: '#fce7f3',
    emoji: '⚗️',
    description: 'Understand the composition, structure, properties and reactions of matter at the atomic level.',
    totalHours: 200,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 68,
        units: [
          { unit: 'Unit 1', title: 'Atomic Structure', topics: ['Bohr Model', 'Quantum Numbers', 'Electronic Configuration'], hours: 20 },
          { unit: 'Unit 2', title: 'Periodic Table', topics: ['Periodicity', 'Trends in Properties', 'Groups & Periods'], hours: 16 },
          { unit: 'Unit 3', title: 'Chemical Bonding', topics: ['Ionic Bond', 'Covalent Bond', 'Molecular Geometry'], hours: 18 },
          { unit: 'Unit 4', title: 'States of Matter', topics: ['Gases', 'Liquids', 'Solids'], hours: 14 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 72,
        units: [
          { unit: 'Unit 5', title: 'Thermodynamics', topics: ['Enthalpy', 'Entropy', 'Gibbs Energy'], hours: 20 },
          { unit: 'Unit 6', title: 'Chemical Equilibrium', topics: ['Le Chatelier\'s Principle', 'Kp & Kc', 'Ionic Equilibrium'], hours: 18 },
          { unit: 'Unit 7', title: 'Electrochemistry', topics: ['Galvanic Cells', 'Electrolysis', 'Nernst Equation'], hours: 18 },
          { unit: 'Unit 8', title: 'Organic Chemistry', topics: ['Hydrocarbons', 'Functional Groups', 'Reactions'], hours: 16 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 60,
        units: [
          { unit: 'Unit 9', title: 'Biomolecules & Polymers', topics: ['Carbohydrates', 'Proteins', 'Polymers'], hours: 20 },
          { unit: 'Unit 10', title: 'Environmental Chemistry', topics: ['Pollution', 'Green Chemistry', 'Ozone Layer'], hours: 15 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Equations Practice', 'Mechanisms', 'Numericals'], hours: 25 },
        ]
      }
    ]
  },

  Botany: {
    color: '#16a34a',
    accent: '#dcfce7',
    emoji: '🌿',
    description: 'Explore the plant kingdom — from cell biology and genetics to ecology and plant physiology.',
    totalHours: 180,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 62,
        units: [
          { unit: 'Unit 1', title: 'Cell Biology', topics: ['Cell Structure', 'Cell Division', 'Cell Organelles'], hours: 20 },
          { unit: 'Unit 2', title: 'Plant Morphology', topics: ['Root System', 'Stem & Leaf', 'Flower & Fruit'], hours: 18 },
          { unit: 'Unit 3', title: 'Plant Taxonomy', topics: ['Classification Systems', 'Angiosperms', 'Gymnosperms'], hours: 14 },
          { unit: 'Unit 4', title: 'Algae & Fungi', topics: ['Thallophyta', 'Fungi Types', 'Economic Importance'], hours: 10 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 65,
        units: [
          { unit: 'Unit 5', title: 'Plant Physiology', topics: ['Photosynthesis', 'Respiration', 'Transport in Plants'], hours: 22 },
          { unit: 'Unit 6', title: 'Genetics', topics: ['Mendel\'s Laws', 'Chromosomes', 'DNA Structure'], hours: 20 },
          { unit: 'Unit 7', title: 'Plant Hormones', topics: ['Auxins', 'Gibberellins', 'Cytokinins'], hours: 12 },
          { unit: 'Unit 8', title: 'Ecology', topics: ['Ecosystems', 'Biogeochemical Cycles', 'Biomes'], hours: 11 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 53,
        units: [
          { unit: 'Unit 9', title: 'Biotechnology', topics: ['Recombinant DNA', 'GM Crops', 'Tissue Culture'], hours: 20 },
          { unit: 'Unit 10', title: 'Plant Diseases', topics: ['Bacterial Diseases', 'Fungal Diseases', 'Control Methods'], hours: 13 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Diagram Practice', 'Classification Tables', 'MCQs'], hours: 20 },
        ]
      }
    ]
  },

  Zoology: {
    color: '#ea580c',
    accent: '#ffedd5',
    emoji: '🦁',
    description: 'Study the animal kingdom — from invertebrates to vertebrates, genetics, and human physiology.',
    totalHours: 180,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 62,
        units: [
          { unit: 'Unit 1', title: 'Animal Classification', topics: ['Invertebrates', 'Vertebrates', 'Phylum Overview'], hours: 20 },
          { unit: 'Unit 2', title: 'Animal Tissue', topics: ['Epithelial', 'Connective', 'Muscular & Nervous'], hours: 15 },
          { unit: 'Unit 3', title: 'Organ Systems', topics: ['Digestive System', 'Circulatory System', 'Respiratory System'], hours: 15 },
          { unit: 'Unit 4', title: 'Animal Behaviour', topics: ['Instinct & Learning', 'Communication', 'Migration'], hours: 12 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 65,
        units: [
          { unit: 'Unit 5', title: 'Human Physiology', topics: ['Nervous System', 'Endocrine System', 'Excretion'], hours: 22 },
          { unit: 'Unit 6', title: 'Reproduction', topics: ['Sexual Reproduction', 'Human Reproduction', 'Development'], hours: 18 },
          { unit: 'Unit 7', title: 'Genetics & Evolution', topics: ['Mendelian Genetics', 'Mutations', 'Darwinism'], hours: 15 },
          { unit: 'Unit 8', title: 'Immunity', topics: ['Innate & Adaptive Immunity', 'Vaccines', 'Diseases'], hours: 10 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 53,
        units: [
          { unit: 'Unit 9', title: 'Applied Zoology', topics: ['Sericulture', 'Apiculture', 'Aquaculture'], hours: 15 },
          { unit: 'Unit 10', title: 'Biotechnology & Animals', topics: ['Cloning', 'Transgenic Animals', 'Stem Cells'], hours: 18 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Diagrams', 'Classification Charts', 'Short Notes'], hours: 20 },
        ]
      }
    ]
  },

  Accounts: {
    color: '#1d4ed8',
    accent: '#dbeafe',
    emoji: '📊',
    description: 'Master financial accounting principles, bookkeeping, and preparation of financial statements.',
    totalHours: 190,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 65,
        units: [
          { unit: 'Unit 1', title: 'Introduction to Accounting', topics: ['Accounting Concepts', 'Double Entry System', 'Journal Entries'], hours: 20 },
          { unit: 'Unit 2', title: 'Ledger & Trial Balance', topics: ['Posting to Ledger', 'Trial Balance Preparation', 'Errors'], hours: 18 },
          { unit: 'Unit 3', title: 'Subsidiary Books', topics: ['Cash Book', 'Purchase & Sales Book', 'Returns Books'], hours: 15 },
          { unit: 'Unit 4', title: 'Bank Reconciliation', topics: ['BRS Purpose', 'Preparation Steps', 'Adjusted Balance'], hours: 12 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 70,
        units: [
          { unit: 'Unit 5', title: 'Depreciation', topics: ['SLM Method', 'WDV Method', 'Disposal of Assets'], hours: 18 },
          { unit: 'Unit 6', title: 'Final Accounts', topics: ['Trading Account', 'P&L Account', 'Balance Sheet'], hours: 25 },
          { unit: 'Unit 7', title: 'Partnership Accounts', topics: ['Partnership Deed', 'Profit Sharing', 'Goodwill'], hours: 15 },
          { unit: 'Unit 8', title: 'Company Accounts', topics: ['Share Capital', 'Debentures', 'Issue of Shares'], hours: 12 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 55,
        units: [
          { unit: 'Unit 9', title: 'Ratio Analysis', topics: ['Liquidity Ratios', 'Profitability Ratios', 'Solvency Ratios'], hours: 18 },
          { unit: 'Unit 10', title: 'Cash Flow Statement', topics: ['Operating Activities', 'Investing Activities', 'Financing'], hours: 17 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Journal Practice', 'Final Accounts Problems', 'MCQs'], hours: 20 },
        ]
      }
    ]
  },

  Economics: {
    color: '#0f766e',
    accent: '#ccfbf1',
    emoji: '📈',
    description: 'Understand micro and macroeconomics, market structures, national income, and economic policies.',
    totalHours: 160,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 55,
        units: [
          { unit: 'Unit 1', title: 'Microeconomics – Basics', topics: ['Scarcity & Choice', 'Opportunity Cost', 'PPC'], hours: 15 },
          { unit: 'Unit 2', title: 'Demand & Supply', topics: ['Law of Demand', 'Law of Supply', 'Equilibrium'], hours: 18 },
          { unit: 'Unit 3', title: 'Elasticity', topics: ['Price Elasticity', 'Income Elasticity', 'Cross Elasticity'], hours: 12 },
          { unit: 'Unit 4', title: 'Theory of Production', topics: ['Production Function', 'Returns to Factor', 'Costs'], hours: 10 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 60,
        units: [
          { unit: 'Unit 5', title: 'Market Structures', topics: ['Perfect Competition', 'Monopoly', 'Oligopoly'], hours: 18 },
          { unit: 'Unit 6', title: 'Macroeconomics – National Income', topics: ['GDP', 'GNP', 'Methods of Calculation'], hours: 18 },
          { unit: 'Unit 7', title: 'Money & Banking', topics: ['Functions of Money', 'Credit Creation', 'RBI & Its Role'], hours: 14 },
          { unit: 'Unit 8', title: 'Inflation', topics: ['Types of Inflation', 'Causes & Effects', 'Control Measures'], hours: 10 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 45,
        units: [
          { unit: 'Unit 9', title: 'Government Budget', topics: ['Types of Budget', 'Fiscal Policy', 'Deficit Financing'], hours: 15 },
          { unit: 'Unit 10', title: 'Indian Economy', topics: ['Five Year Plans', 'Economic Reforms 1991', 'Current Challenges'], hours: 15 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Graphs & Diagrams', 'Definition Cards', 'Past Papers'], hours: 15 },
        ]
      }
    ]
  },

  'Computer Science': {
    color: '#6d28d9',
    accent: '#ede9fe',
    emoji: '💻',
    description: 'Learn programming, data structures, algorithms, databases, and computer networks.',
    totalHours: 210,
    curriculum: [
      {
        term: 'Term 1',
        months: 'June – September',
        hours: 72,
        units: [
          { unit: 'Unit 1', title: 'Python Programming', topics: ['Data Types', 'Control Flow', 'Functions & Modules'], hours: 25 },
          { unit: 'Unit 2', title: 'Object-Oriented Programming', topics: ['Classes & Objects', 'Inheritance', 'Polymorphism'], hours: 20 },
          { unit: 'Unit 3', title: 'Data Structures', topics: ['Lists & Stacks', 'Queues', 'Dictionaries'], hours: 15 },
          { unit: 'Unit 4', title: 'Computer Organization', topics: ['CPU Architecture', 'Memory Hierarchy', 'I/O Devices'], hours: 12 },
        ]
      },
      {
        term: 'Term 2',
        months: 'October – January',
        hours: 78,
        units: [
          { unit: 'Unit 5', title: 'Database Management', topics: ['SQL Basics', 'Normalization', 'Transactions'], hours: 25 },
          { unit: 'Unit 6', title: 'Computer Networks', topics: ['OSI Model', 'TCP/IP', 'Network Security'], hours: 20 },
          { unit: 'Unit 7', title: 'Web Technologies', topics: ['HTML & CSS', 'JavaScript Basics', 'Client-Server Model'], hours: 18 },
          { unit: 'Unit 8', title: 'Algorithms', topics: ['Sorting Algorithms', 'Searching', 'Time Complexity'], hours: 15 },
        ]
      },
      {
        term: 'Term 3',
        months: 'February – April',
        hours: 60,
        units: [
          { unit: 'Unit 9', title: 'File Handling & Exception', topics: ['File Operations', 'Exception Handling', 'Logging'], hours: 18 },
          { unit: 'Unit 10', title: 'Project Work', topics: ['Mini Project Design', 'Implementation', 'Documentation'], hours: 25 },
          { unit: 'Unit 11', title: 'Exam Preparation', topics: ['Code Tracing', 'Output Questions', 'Algorithm Writing'], hours: 17 },
        ]
      }
    ]
  }
};

const SubjectDetails = () => {
  const { subjectName } = useParams();
  const navigate = useNavigate();
  const [expandedTerms, setExpandedTerms] = React.useState({ 0: true });

  const data = subjectData[subjectName];

  if (!data) {
    return (
      <div className="sd-not-found">
        <h2>Subject not found</h2>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const toggleTerm = (idx) => {
    setExpandedTerms(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalUnits = data.curriculum.reduce((acc, term) => acc + term.units.length, 0);

  return (
    <div className="sd-wrapper">

      {/* Header */}
      <div className="sd-header" style={{ '--subject-color': data.color, '--subject-accent': data.accent }}>
        <button className="sd-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        <div className="sd-hero">
          <div className="sd-emoji-badge">{data.emoji}</div>
          <div className="sd-hero-text">
            <h1>{subjectName}</h1>
            <p className="sd-description">{data.description}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="sd-stats-row">
          <div className="sd-stat-card">
            <FaClock className="sd-stat-icon" />
            <span className="sd-stat-value">{data.totalHours}</span>
            <span className="sd-stat-label">Total Hours</span>
          </div>
          <div className="sd-stat-card">
            <FaCalendarAlt className="sd-stat-icon" />
            <span className="sd-stat-value">{data.curriculum.length}</span>
            <span className="sd-stat-label">Terms</span>
          </div>
          <div className="sd-stat-card">
            <FaBook className="sd-stat-icon" />
            <span className="sd-stat-value">{totalUnits}</span>
            <span className="sd-stat-label">Units</span>
          </div>
          <div className="sd-stat-card">
            <FaGraduationCap className="sd-stat-icon" />
            <span className="sd-stat-value">Annual</span>
            <span className="sd-stat-label">Duration</span>
          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <div className="sd-curriculum">
        <h2 className="sd-section-title">
          <FaStar style={{ color: data.color }} /> Year Curriculum
        </h2>

        {data.curriculum.map((term, termIdx) => (
          <div key={termIdx} className="sd-term-block">

            {/* Term Header */}
            <div
              className="sd-term-header"
              style={{ '--subject-color': data.color }}
              onClick={() => toggleTerm(termIdx)}
            >
              <div className="sd-term-left">
                <span className="sd-term-badge" style={{ background: data.color }}>{term.term}</span>
                <div>
                  <div className="sd-term-title">{term.months}</div>
                  <div className="sd-term-meta">{term.units.length} Units · {term.hours} Hours</div>
                </div>
              </div>
              <div className="sd-term-right">
                <div className="sd-term-hours">
                  <FaClock /> {term.hours}h
                </div>
                {expandedTerms[termIdx] ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>

            {/* Term Units */}
            {expandedTerms[termIdx] && (
              <div className="sd-units-grid">
                {term.units.map((unit, unitIdx) => (
                  <div key={unitIdx} className="sd-unit-card" style={{ '--subject-color': data.color }}>
                    <div className="sd-unit-header">
                      <span className="sd-unit-label">{unit.unit}</span>
                      <span className="sd-unit-hours"><FaClock /> {unit.hours}h</span>
                    </div>
                    <h4 className="sd-unit-title">{unit.title}</h4>
                    <ul className="sd-topics-list">
                      {unit.topics.map((topic, tIdx) => (
                        <li key={tIdx}>
                          <span className="sd-topic-dot" style={{ background: data.color }}></span>
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectDetails;