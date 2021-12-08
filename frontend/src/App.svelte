<script>
  import page from "page";

  // importing all the possible routes
  import Home from "./pages/Home.svelte";

  // family receipes
  import BraisedBeef from "./pages/family/BraisedBeef.svelte";
  import ChickenPan from "./pages/family/ChickenPan.svelte";
  import SausageBalls from "./pages/family/SausageBalls.svelte";

  // french receipes
  import RoastedCarrots from "./pages/french/RoastedCarrots.svelte";

  // italian
  import HomemadePasta from "./pages/italian/HomemadePasta.svelte";

  // set default component
  let current = Home;

  // Map routes to page. If a route is hit the current
  // reference is set to the route's component
  page("/", () => (current = Home));

  // family routes
  page("/braised_beef", () => (current = BraisedBeef));
  page("/chicken_pan", () => (current = ChickenPan));
  page("/sausage_balls", () => (current = SausageBalls));

  // french routes
  page("/roasted_carrots", () => (current = RoastedCarrots));

  // italian routes
  page("/homemade_pasta", () => (current = HomemadePasta));

  // activate router
  page.start();
</script>

<main>
  <nav>
    <a href="/">Home</a>
  </nav>

  <svelte:component this={current} />
</main>

<style>
  main {
    max-width: 720px;
    margin-right: auto;
    margin-left: auto;
    padding-bottom: 50px;
  }
  :global(body) {
    background-color: #f5e29c26;
  }
</style>
