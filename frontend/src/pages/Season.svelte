<script>
  import { onMount } from "svelte";

  // initiate everything outside of the onMount
  let location = [];
  let state = "";
  let period = "";
  let month = "";
  let produce = [];

  // the following will happen once the page finishes loading
  onMount(async () => {
    // we wait for the server to do its thing
    const res = await fetch(`./location`);
    location = await res.json();

    // accessing the values on return
    state = location.state;
    period = location.period;
    month = location.month;
    produce = location.produce;
  });
</script>

<h3>In {state} during {period} {month}, the following produce is in season:</h3>
<ul>
  {#each produce}
    <li>{produce}</li>
  {/each}
</ul>
