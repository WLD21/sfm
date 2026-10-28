// Adapter around the complete, unmodified MIT Scroll Craft runtime.
export async function mountScrollExperience(root, canceled) {
  await import('../tools/scroll-craft/engine/scrollcraft.js');
  if (canceled()) return () => {};
  const instance = window.ScrollCraft.mount(root);
  return () => {
    instance.destroy();
    document.documentElement.classList.add('sc-ready');
    root.querySelectorAll('[data-sc-in], [data-sc-parallax], [data-sc-reveal]').forEach(node => {
      for (const property of ['opacity', 'transform', 'clip-path', 'transition']) node.style.removeProperty(property);
    });
  };
}
