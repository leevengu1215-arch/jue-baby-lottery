import {sqliteTable,text,integer,index,check} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const members=sqliteTable('members',{
 tokenHash:text('token_hash').primaryKey(),
 publicId:text('public_id').notNull().unique(),
 nickname:text('nickname').notNull(),
 face:text('face').notNull(),
 pool:text('pool'),
 updatedAt:integer('updated_at').notNull()
},t=>[index('members_pool_updated').on(t.pool,t.updatedAt),check('valid_pool',sql`${t.pool} IS NULL OR ${t.pool} IN ('boy','girl')`)]);
