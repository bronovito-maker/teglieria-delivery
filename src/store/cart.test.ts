import { beforeEach, expect, it } from "vitest";
import { useCartStore } from "./cart";
beforeEach(() => useCartStore.setState({items:[]}));
it("non mostra risparmio Club per il prezzo del configuratore rappresentato nelle aggiunte", () => {
  useCartStore.setState({ items: [{ id:"test", productId:"builder",productName:"Crea la tua pizza",quantity:2,unitPrice:0,standardUnitPrice:40,variantPriceDelta:0,additions:[{name:"Base e ingredienti",price:40}],removals:[],totalPrice:80 }] });
  expect(useCartStore.getState().getClubSavings()).toBe(0);
});
it("calcola il risparmio Club includendo extra e quantità", () => {
  useCartStore.setState({ items: [{ id:"test",productId:"regina",productName:"La Regina",quantity:2,unitPrice:24,standardUnitPrice:32,variantPriceDelta:0,additions:[{name:"Extra",price:3}],removals:[],totalPrice:54 }] });
  expect(useCartStore.getState().getClubSavings()).toBe(10);
});
