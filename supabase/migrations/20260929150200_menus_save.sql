-- The three menus every site has (items are seeded with the default content) and an atomic
-- save_menu() so a menu (with its dropdown items) is always replaced in one transaction.

insert into public.menus (key, title) values
  ('header', null),
  ('footer_1', 'Explore'),
  ('footer_2', 'What we do')
on conflict (key) do nothing;

/**
 * Replaces a menu's items. items: [{ label, link, open_in_new_tab, children: [...] }]
 * (children only for the header, one level). Requires content 'edit'. Audited.
 */
create function public.save_menu(menu_key text, title text, items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  menu uuid;
  item jsonb;
  child jsonb;
  parent uuid;
  position integer := 0;
  child_position integer;
  total integer := 0;
begin
  if not public.can('content', 'edit') then
    raise exception 'You don''t have permission to edit menus.' using errcode = '42501';
  end if;
  select m.id into menu from public.menus m where m.key = menu_key for update;
  if not found then
    raise exception 'Unknown menu "%".', menu_key using errcode = 'P0002';
  end if;
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'items must be an array.' using errcode = '22023';
  end if;
  if jsonb_array_length(items) > 30 then
    raise exception 'A menu can have at most 30 items.' using errcode = '22023';
  end if;

  update public.menus m set title = nullif(trim(save_menu.title), '') where m.id = menu;
  delete from public.menu_items i where i.menu_id = menu;

  for item in select value from jsonb_array_elements(items) loop
    insert into public.menu_items (menu_id, label, link, sort_order, open_in_new_tab)
    values (menu, trim(item ->> 'label'), item -> 'link', position, coalesce((item ->> 'open_in_new_tab')::boolean, false))
    returning id into parent;
    position := position + 1;
    total := total + 1;
    child_position := 0;
    for child in select value from jsonb_array_elements(coalesce(item -> 'children', '[]'::jsonb)) loop
      -- check_menu_item_nesting() rejects children outside the header.
      insert into public.menu_items (menu_id, parent_id, label, link, sort_order, open_in_new_tab)
      values (menu, parent, trim(child ->> 'label'), child -> 'link', child_position, coalesce((child ->> 'open_in_new_tab')::boolean, false));
      child_position := child_position + 1;
      total := total + 1;
    end loop;
  end loop;

  perform public.log_audit('menu.saved', 'content', 'menus', menu_key, jsonb_build_object('items', total));
  return total;
end;
$$;

revoke execute on function public.save_menu(text, text, jsonb) from public, anon;
grant execute on function public.save_menu(text, text, jsonb) to authenticated;
