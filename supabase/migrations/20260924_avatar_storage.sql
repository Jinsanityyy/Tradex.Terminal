-- Avatars move out of profiles.avatar_url as base64 text and into Storage.
--
-- They used to be drawn onto a canvas and saved as an 80px JPEG data URL. That
-- kept only the first frame of a GIF, blurred on high-density screens, and put
-- an unbounded string in a text column and in localStorage. The file is now
-- stored as uploaded (so a GIF stays animated) and the profile keeps its URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728,
        array['image/gif', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Uploads normally go through the server with the service role. These policies
-- cover the fallback where the server writes with the user's own session:
-- anyone may read, and a user may only write inside a folder named for them.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Avatars are publicly readable') then
    create policy "Avatars are publicly readable" on storage.objects
      for select using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Users write their own avatar') then
    create policy "Users write their own avatar" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Users replace their own avatar') then
    create policy "Users replace their own avatar" on storage.objects
      for update to authenticated
      using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
