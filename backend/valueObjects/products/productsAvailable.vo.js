export class ProductsAvailableVO {
  constructor({ id, name, perishable, unit_id, actual_stock }) {
    this.id = id;
    this.name = name;
    this.perishable = perishable;
    this.unit_id = unit_id;
    this.actual_stock = Number(actual_stock);

    Object.freeze(this);
  }
}
