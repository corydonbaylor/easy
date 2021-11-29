<script>
  import page from "page";

  import Home from "./pages/Home.svelte";
  import BraisedBeef from "./pages/mains/BraisedBeef.svelte";
  import ChickenPan from "./pages/mains/ChickenPan.svelte";
  import BeefTagine from "./pages/mains/BeefTagine.svelte";
  import HomemadePasta from "./pages/mains/HomemadePasta.svelte";

  // set default component
  let current = Home;

  // Map routes to page. If a route is hit the current
  // reference is set to the route's component
  page("/", () => (current = Home));
  page("/braised_beef", () => (current = BraisedBeef));
  page("/chicken_pan", () => (current = ChickenPan));
  page("/beef_tagine", () => (current = BeefTagine));
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
