import * as migration_20260812_053117_initial from './20260812_053117_initial';
import * as migration_20260812_075924_catalog from './20260812_075924_catalog';
import * as migration_20260812_083010_orientation from './20260812_083010_orientation';
import * as migration_20260812_084941_content_types from './20260812_084941_content_types';
import * as migration_20260812_091008_entry_slug from './20260812_091008_entry_slug';
import * as migration_20260812_135435_drop_external_brand from './20260812_135435_drop_external_brand';
import * as migration_20260813_064410_block_orientation from './20260813_064410_block_orientation';
import * as migration_20260813_080826_occasion_unspecified from './20260813_080826_occasion_unspecified';
import * as migration_20260813_083202_attribution_roles from './20260813_083202_attribution_roles';
import * as migration_20260813_090803_surfaces_as_blocks from './20260813_090803_surfaces_as_blocks';
import * as migration_20260813_091516_editor_thumbnails from './20260813_091516_editor_thumbnails';
import * as migration_20260814_153025_drop_multitenancy from './20260814_153025_drop_multitenancy';
import * as migration_20260819_032512_film_poster_person_portrait from './20260819_032512_film_poster_person_portrait';

export const migrations = [
  {
    up: migration_20260812_053117_initial.up,
    down: migration_20260812_053117_initial.down,
    name: '20260812_053117_initial',
  },
  {
    up: migration_20260812_075924_catalog.up,
    down: migration_20260812_075924_catalog.down,
    name: '20260812_075924_catalog',
  },
  {
    up: migration_20260812_083010_orientation.up,
    down: migration_20260812_083010_orientation.down,
    name: '20260812_083010_orientation',
  },
  {
    up: migration_20260812_084941_content_types.up,
    down: migration_20260812_084941_content_types.down,
    name: '20260812_084941_content_types',
  },
  {
    up: migration_20260812_091008_entry_slug.up,
    down: migration_20260812_091008_entry_slug.down,
    name: '20260812_091008_entry_slug',
  },
  {
    up: migration_20260812_135435_drop_external_brand.up,
    down: migration_20260812_135435_drop_external_brand.down,
    name: '20260812_135435_drop_external_brand',
  },
  {
    up: migration_20260813_064410_block_orientation.up,
    down: migration_20260813_064410_block_orientation.down,
    name: '20260813_064410_block_orientation',
  },
  {
    up: migration_20260813_080826_occasion_unspecified.up,
    down: migration_20260813_080826_occasion_unspecified.down,
    name: '20260813_080826_occasion_unspecified',
  },
  {
    up: migration_20260813_083202_attribution_roles.up,
    down: migration_20260813_083202_attribution_roles.down,
    name: '20260813_083202_attribution_roles',
  },
  {
    up: migration_20260813_090803_surfaces_as_blocks.up,
    down: migration_20260813_090803_surfaces_as_blocks.down,
    name: '20260813_090803_surfaces_as_blocks',
  },
  {
    up: migration_20260813_091516_editor_thumbnails.up,
    down: migration_20260813_091516_editor_thumbnails.down,
    name: '20260813_091516_editor_thumbnails',
  },
  {
    up: migration_20260814_153025_drop_multitenancy.up,
    down: migration_20260814_153025_drop_multitenancy.down,
    name: '20260814_153025_drop_multitenancy',
  },
  {
    up: migration_20260819_032512_film_poster_person_portrait.up,
    down: migration_20260819_032512_film_poster_person_portrait.down,
    name: '20260819_032512_film_poster_person_portrait'
  },
];
