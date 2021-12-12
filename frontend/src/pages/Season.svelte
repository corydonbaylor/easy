<script>
  import { onMount } from "svelte";

  onMount(async () => {
    const res = await fetch(`./location`);
    location = await res.json();
  });
</script>

<div>test</div>
