// These four menu entries group different stock items at the same price.
export const BEVERAGE_CHOICES: Record<string, readonly string[]> = {
  "Estathé pesca o limone - brick": ["Estathé pesca", "Estathé limone"],
  "Estathé pesca o limone - PET": ["Estathé pesca", "Estathé limone"],
  "Coca-Cola, Coca-Cola Zero o Fanta - lattina": ["Coca-Cola", "Coca-Cola Zero", "Fanta"],
  "Coca-Cola, Coca-Cola Zero o Fanta Lemon - PET": ["Coca-Cola", "Coca-Cola Zero", "Fanta Lemon"],
};
export function requiresBeverageChoice(name: string) {
  return Object.hasOwn(BEVERAGE_CHOICES, name);
}
export function validBeverageChoice(name: string, choice?: string | null) {
  return !requiresBeverageChoice(name) || !!choice && BEVERAGE_CHOICES[name].includes(choice);
}
