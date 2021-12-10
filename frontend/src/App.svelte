<script>
  import page from "page";

  // importing all the possible routes
  import Home from "./pages/Home.svelte";

  // family receipes
  import BraisedBeef from "./pages/family/BraisedBeef.svelte";
  import ChickenPan from "./pages/family/ChickenPan.svelte";
  import SausageBalls from "./pages/family/SausageBalls.svelte";
  import SweetRolls from "./pages/family/SweetRolls.svelte";
  import Biscuits from "./pages/family/Biscuits.svelte";
  import Grits from "./pages/family/Grits.svelte";

  // french receipes
  import RoastedCarrots from "./pages/french/RoastedCarrots.svelte";

  // italian
  import HomemadePasta from "./pages/italian/HomemadePasta.svelte";

  // Central European
  import Paprika from "./pages/central/Paprika.svelte";
  import Korozott from "./pages/central/Korozott.svelte";
  import Makosguba from "./pages/central/Makosguba.svelte";
  import HungarianPea from "./pages/central/HungarianPea.svelte";

  // set default component
  let current = Home;

  // Map routes to page. If a route is hit the current
  // reference is set to the route's component
  page("/", () => (current = Home));

  // family routes
  page("/braised_beef", () => (current = BraisedBeef));
  page("/chicken_pan", () => (current = ChickenPan));
  page("/sausage_balls", () => (current = SausageBalls));
  page("/sweet_rolls", () => (current = SweetRolls));
  page("/biscuits", () => (current = Biscuits));
  page("/grits", () => (current = Grits));

  // french routes
  page("/roasted_carrots", () => (current = RoastedCarrots));

  // italian routes
  page("/homemade_pasta", () => (current = HomemadePasta));

  // central routes
  page("/chicken_paprika", () => (current = Paprika));
  page("/korozott", () => (current = Korozott));
  page("/makosguba", () => (current = Makosguba));
  page("/hungarian_pea", () => (current = HungarianPea));
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
