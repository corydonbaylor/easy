<script>
  // each of these has a menu in it
  import Family from "./family/Family.svelte";
  import French from "./french/French.svelte";

  // depending on what the user selects, a different menu will show
  let menu = Family;

  function family() {
    menu = Family;
  }

  function french() {
    menu = French;
  }
</script>

<p>
  Welcome to the cleanest recipe website on the web. No life story, just what
  you need and how to prepare it.
</p>

<div class="menus">
  <div on:click={family} class="menu">Family Classics</div>
  <div on:click={french} class="menu">French</div>
  <div>Italian</div>
</div>

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
  }
</style>
