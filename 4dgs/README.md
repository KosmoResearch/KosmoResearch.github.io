# 4DGS Web Player Demo

A demo of a 4D Gaussian Splatting web player with six ACS scenes and seven VVC scenes.

`ACS two_people clean · 47 s` loads its complete cleaned cache and two progressive
previews from Hugging Face. The timeline uses the actual 46.99695-second duration.
The full compressed model is 1.76 GB and requires substantially more browser and
GPU memory than the five-second demos; four texture allocations retain full detail.
Open it directly with `?model=acs_two_people_47s_clean`.

VVC assets load directly from the [existing HF directory](https://huggingface.co/datasets/KosmoResearch/Kosmo-GFM/tree/main/website-assets/20261106/4dgs-player).
These VVC exports contain full models without progressive previews; the circular
indicator shows loading progress until the scene is ready.

Live demo: <https://kosmoresearch.github.io/4dgs/>
