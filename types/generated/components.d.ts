import type { Schema, Struct } from '@strapi/strapi';

export interface CurrencyValuesValues extends Struct.ComponentSchema {
  collectionName: 'components_currency_values_values';
  info: {
    displayName: 'values';
    icon: 'priceTag';
  };
  attributes: {
    currency: Schema.Attribute.Relation<'oneToOne', 'api::currency.currency'>;
    numberOf: Schema.Attribute.Integer;
  };
}

export interface TemplateSubtask extends Struct.ComponentSchema {
  collectionName: 'components_template_subtasks';
  info: {
    displayName: 'subtask';
  };
  attributes: {
    dependencies: Schema.Attribute.JSON;
    expectedTime: Schema.Attribute.Integer;
    index: Schema.Attribute.Integer;
    maxSameTimeWorkers: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<1>;
    name: Schema.Attribute.String;
    qty: Schema.Attribute.Integer;
    sharingType: Schema.Attribute.Enumeration<['qty', 'duration']>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'currency-values.values': CurrencyValuesValues;
      'template.subtask': TemplateSubtask;
    }
  }
}
