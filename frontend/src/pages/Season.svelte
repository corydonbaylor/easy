<script>
  import { onMount } from "svelte";

  let location = [];
  let poop = "";

  onMount(async () => {
    const res = await fetch(`./location`);
    location = await res.json();
    poop = JSON.stringify(location);
  });
</script>

<div>{poop}</div>
