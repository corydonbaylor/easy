<script>
  // each of these has a menu in it
  import Family from "./family/Family.svelte";
  import French from "./french/French.svelte";
  import Central from "./central/Central.svelte";
  import Italian from "./italian/Italian.svelte";

  // depending on what the user selects, a different menu will show
  let menu = Family;

  // depending on what menu is clicked, a selected class will change
  let current = "family";
</script>

<h2>Recipes</h2>

<div class="menus">
  <div
    on:click={() => (menu = Family)}
    on:click={() => (current = "family")}
    class="menu {current === 'family' ? 'selected' : ''}"
  >
    Family Classics
  </div>
  <div
    on:click={() => (menu = French)}
    on:click={() => (current = "french")}
    class="menu {current === 'french' ? 'selected' : ''}"
  >
    French
  </div>
  <div
    on:click={() => (menu = Italian)}
    on:click={() => (current = "italian")}
    class="menu {current === 'italian' ? 'selected' : ''}"
  >
    Italian
  </div>
</div>

<div class="menus">
  <div
    on:click={() => (menu = Family)}
    on:click={() => (current = "english")}
    class="menu {current === 'english' ? 'selected' : ''}"
  >
    English
  </div>

  <div
    on:click={() => (menu = Central)}
    on:click={() => (current = "central")}
    class="menu {current === 'central' ? 'selected' : ''}"
  >
    Central European
  </div>
  <div
    on:click={() => (menu = French)}
    on:click={() => (current = "other")}
    class="menu {current === 'other' ? 'selected' : ''}"
  >
    Other
  </div>
</div>
<hr />
<svelte:component this={menu} />

<style>
  .menus {
    font-weight: bold;
    display: table;
    width: 100%; /*Optional*/
    table-layout: fixed; /*Optional*/
    border-spacing: 10px; /*Optional*/
    text-align: center;
  }

  .menu {
    display: table-cell;
    cursor: pointer;
  }

  .menu:hover {
    text-decoration: underline;
  }

  .selected {
    text-decoration: underline;
  }

  h2 {
    text-align: center;
  }
</style>
