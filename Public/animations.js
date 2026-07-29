(() => {
  function pulse(node, className = "anim-pop", ms = 280) {
    if (!node) return;
    node.classList.remove("anim-slide", "anim-fade", "anim-pop");
    void node.offsetWidth;
    node.classList.add(className);
    window.setTimeout(() => node.classList.remove(className), ms);
  }

  function enter(node, mode = "slide") {
    pulse(node, `anim-${mode || "slide"}`);
  }

  function exit(node) {
    if (!node) return;
    node.classList.add("anim-fade");
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
  }

  window.StreamFusionAnimations = { pulse, enter, exit };
})();
