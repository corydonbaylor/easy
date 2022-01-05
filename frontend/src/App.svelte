<script>
  // this function ensures that when some navigates to a new page,
  // the new page loads at the top -- otherwise the y position,
  // will be wherever the last y position was
  history.pushState = new Proxy(history.pushState, {
    apply(target, thisArg, argumentsList) {
      // scrollTo(0,0) <-- order of operation can mather (ty, @t-lock)
      Reflect.apply(target, thisArg, argumentsList);
      scrollTo(0, 0);
    },
  });
  // importing packages
  import page from "page";

  // importing components
  import Navbar from "./pages/components/Navbar.svelte";

  // importing all the possible routes
  import Home from "./pages/Home.svelte";
  import Seasons from "./pages/Seasons.svelte";

  // family receipes
  import BraisedBeef from "./pages/family/BraisedBeef.svelte";
  import ChickenPan from "./pages/family/ChickenPan.svelte";
  import SausageBalls from "./pages/family/SausageBalls.svelte";
  import SweetRolls from "./pages/family/SweetRolls.svelte";
  import Biscuits from "./pages/family/Biscuits.svelte";
  import Grits from "./pages/family/Grits.svelte";
  import SweetPotatoSoup from "./pages/family/SweetPotatoSoup.svelte";

  // french receipes
  import RoastedCarrots from "./pages/french/RoastedCarrots.svelte";
  import CoqAuVin from "./pages/french/CoqAuVin.svelte";
  import BeefBourguignon from "./pages/french/BeefBourguignon.svelte";
  import Baguette from "./pages/french/Baguette.svelte";
  import FrenchOnion from "./pages/french/FrenchOnion.svelte";
  import PouletChasseur from "./pages/french/PouletChasseur.svelte";

  // italian
  import HomemadePasta from "./pages/italian/HomemadePasta.svelte";
  import CacioPepe from "./pages/italian/CacioPepe.svelte";
  import Pesto from "./pages/italian/Pesto.svelte";

  // Central European
  import Paprika from "./pages/central/Paprika.svelte";
  import Korozott from "./pages/central/Korozott.svelte";
  import Makosguba from "./pages/central/Makosguba.svelte";
  import HungarianPea from "./pages/central/HungarianPea.svelte";

  // Other
  import Other from "./pages/other/Other.svelte";
  import Rye from "./pages/other/Rye.svelte";

  // set default component
  let current = Home;

  // Map routes to page. If a route is hit the current
  // reference is set to the route's component
  page("/", () => (current = Home));
  page("/seasons", () => (current = Seasons));

  // family routes
  page("/braised_beef", () => (current = BraisedBeef));
  page("/chicken_pan", () => (current = ChickenPan));
  page("/sausage_balls", () => (current = SausageBalls));
  page("/sweet_rolls", () => (current = SweetRolls));
  page("/biscuits", () => (current = Biscuits));
  page("/grits", () => (current = Grits));
  page("/sweet_potato_soup", () => (current = SweetPotatoSoup));

  // french routes
  page("/roasted_carrots", () => (current = RoastedCarrots));
  page("/coq_au_vin", () => (current = CoqAuVin));
  page("/beef_bourguignon", () => (current = BeefBourguignon));
  page("/baguette", () => (current = Baguette));
  page("/french_onion_soup", () => (current = FrenchOnion));
  page("/poulet_chasseur", () => (current = PouletChasseur));

  // italian routes
  page("/homemade_pasta", () => (current = HomemadePasta));
  page("/cacio_pepe", () => (current = CacioPepe));
  page("/pesto", () => (current = Pesto));

  // central routes
  page("/chicken_paprika", () => (current = Paprika));
  page("/korozott", () => (current = Korozott));
  page("/makosguba", () => (current = Makosguba));
  page("/hungarian_pea", () => (current = HungarianPea));

  // other routes
  page("/rye_bread", () => (current = Rye));

  // activate router
  page.start();
</script>

<main>
  <Navbar />
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
