import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('elemental_evolutions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'));
    table.uuid('result_elemental_id').notNullable().references('id').inTable('elementals').onDelete('CASCADE');
    table.integer('required_level').notNullable().checkBetween([1, 3]);
    table.integer('required_count').notNullable().checkBetween([2, 3]);

    // For L1->L2 (same element, 3 required)
    table.string('required_same_element', 20);

    // For L2->L3 (different elements, 2 required)
    table.string('required_element_1', 20);
    table.string('required_element_2', 20);

    // For L3->L4 (specific hybrids, variable count)
    table.jsonb('required_elemental_ids'); // Array of UUIDs

    table.text('hint_text');
    table.boolean('is_discovered_by_default').notNullable().defaultTo(false);

    // Indexes
    table.index(['result_elemental_id']);
    table.index(['required_level']);
    table.index(['required_same_element']);
    table.index(['required_element_1', 'required_element_2']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('elemental_evolutions');
}
