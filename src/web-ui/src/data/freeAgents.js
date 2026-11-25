// Fictional drivers without a seat at the start of the first season:
// junior talents (young, high potential) and experienced veterans.

const d = (name, code, age, potential, pace, consistency, experience, overtaking, defending, tireManagement, salary) => ({
  name, code, age, potential, pace, consistency, experience, adaptability: Math.round((pace + experience) / 2),
  overtaking, defending, tireManagement, starts: Math.round((pace + consistency) / 2), salary,
});

export const FREE_AGENTS = [
  d('Iris Valdez', 'VAL', 19, 95, 84, 78, 52, 83, 76, 80, 900000),
  d('Noah Brennan', 'BRE', 20, 92, 83, 81, 58, 80, 79, 82, 1000000),
  d('Aiko Mori', 'MRI', 21, 90, 85, 83, 64, 82, 80, 84, 1500000),
  d('Farid Haddad', 'HAD', 22, 88, 84, 85, 70, 81, 83, 83, 1800000),
  d('Lena Kraus', 'KRA', 19, 93, 82, 76, 48, 84, 74, 79, 800000),
  d('Marco Bellini', 'BEL', 34, 85, 86, 92, 97, 84, 91, 90, 4000000),
  d('Pieter de Vries', 'VRI', 36, 84, 84, 93, 99, 80, 92, 92, 3500000),
  d('Samuel Osei', 'OSE', 24, 89, 86, 84, 76, 85, 82, 84, 2500000),
];

// Ages and potential for the starting grid (by driver code)
export const GRID_PROFILES = {
  HAK: [24, 95], LAU: [29, 90], BRA: [27, 97], MOR: [25, 92], REY: [28, 95], ERI: [33, 89],
  SIL: [23, 97], FIS: [30, 91], TAK: [26, 92], NOV: [21, 92], LIN: [27, 89], OKA: [22, 91],
  DEM: [28, 88], WEI: [32, 87], HAA: [35, 86], PAR: [20, 91], PET: [26, 86], COS: [23, 88],
  CAR: [21, 88], AYD: [20, 89],
};
