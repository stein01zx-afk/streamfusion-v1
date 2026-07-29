(() => {
  const modes = new Set(["slide", "fade", "pop"]);
  function apply(node, mode = "slide") {
    if (!node) return;
    const cls = `anim-${modes.has(mode) ? mode : "slide"}`;
    node.classList.remove("anim-slide", "anim-fade", "anim-pop");
    void node.offsetWidth;
    node.classList.add(cls);
    window.setTimeout(() => node.classList.remove(cls), 320);
  }
  function enter(node, mode = "slide") { apply(node, mode); }
  function exit(node) {
    if (!node) return;
    node.classList.add("anim-fade");
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
  }
  window.StreamFusionAnimations = { enter, exit, apply };
})();
