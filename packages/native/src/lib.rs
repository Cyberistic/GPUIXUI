use gpuix_native::gpui;
use gpuix_native::{
    custom_surface, CustomElement, CustomElementFactory, CustomRenderContext, GpuixView,
};

struct ShaderFactory;

impl CustomElementFactory for ShaderFactory {
    fn element_type(&self) -> &str {
        "gpuixui-shader"
    }

    fn create(&self, _id: u64) -> Box<dyn CustomElement> {
        Box::new(Shader::default())
    }
}

struct Shader {
    source: gpui::SharedString,
    time: f32,
    params: [[f32; 4]; gpui::SHADER_PARAMS],
    reads_backdrop: bool,
    simulation_source: gpui::SharedString,
    simulation_grid: [u32; 2],
    simulation_uniform: [[f32; 4]; 6],
    data: Option<std::sync::Arc<[[f32; 4]]>>,
}

impl Default for Shader {
    fn default() -> Self {
        Self {
            source: Default::default(),
            time: 0.0,
            params: [[0.0; 4]; gpui::SHADER_PARAMS],
            reads_backdrop: false,
            simulation_source: Default::default(),
            simulation_grid: [0; 2],
            simulation_uniform: [[0.0; 4]; 6],
            data: None,
        }
    }
}

fn vectors<const N: usize>(value: &serde_json::Value) -> [[f32; 4]; N] {
    let mut out = [[0.0; 4]; N];
    let values = value.as_array().map(Vec::as_slice).unwrap_or_default();
    for (index, number) in values.iter().take(N * 4).enumerate() {
        out[index / 4][index % 4] = number.as_f64().unwrap_or_default() as f32;
    }
    out
}

impl CustomElement for Shader {
    fn render(
        &mut self,
        mut ctx: CustomRenderContext,
        _window: &mut gpui::Window,
        _cx: &mut gpui::Context<GpuixView>,
    ) -> gpui::AnyElement {
        use gpui::prelude::*;

        let (source, time, params, reads_backdrop) =
            (self.source.clone(), self.time, self.params, self.reads_backdrop);
        let simulation = (!self.simulation_source.is_empty()).then(|| gpui::ShaderSimulation {
            key: ctx.id,
            source: self.simulation_source.clone(),
            grid: self.simulation_grid,
            uniform: self.simulation_uniform,
        });
        let data = self.data.clone();
        let children = std::mem::take(&mut ctx.children);
        let id = gpui::SharedString::from(format!("gpuixui_shader_{}", ctx.id));
        custom_surface(gpui::div().id(id), &ctx)
            .child(
                gpui::canvas(
                    |_, _, _| {},
                    move |bounds, _, window, _| {
                        window.paint_shader(bounds, source, time, params, reads_backdrop, simulation, data);
                    },
                )
                .absolute()
                .size_full(),
            )
            .children(children)
            .into_any_element()
    }

    fn set_prop(&mut self, key: &str, value: serde_json::Value) {
        match key {
            "source" => self.source = value.as_str().unwrap_or_default().to_string().into(),
            "time" => self.time = value.as_f64().unwrap_or_default() as f32,
            "readsBackdrop" => self.reads_backdrop = value.as_bool().unwrap_or_default(),
            "params" => self.params = vectors(&value),
            "simulationSource" => {
                self.simulation_source = value.as_str().unwrap_or_default().to_string().into()
            }
            "data" => {
                self.data = value.as_array().map(|values| {
                    values
                        .chunks(4)
                        .map(|chunk| {
                            let mut row = [0.0; 4];
                            for (slot, number) in row.iter_mut().zip(chunk) {
                                *slot = number.as_f64().unwrap_or_default() as f32;
                            }
                            row
                        })
                        .collect()
                })
            }
            "simulationUniform" => self.simulation_uniform = vectors(&value),
            "simulationGrid" => {
                let size = |index: usize| value.get(index).and_then(|n| n.as_u64()).unwrap_or(8) as u32;
                self.simulation_grid = [size(0), size(1)];
            }
            _ => {}
        }
    }

    fn supported_props(&self) -> &'static [&'static str] {
        &[
            "source",
            "time",
            "params",
            "readsBackdrop",
            "simulationSource",
            "simulationUniform",
            "simulationGrid",
            "data",
        ]
    }

    fn supported_events(&self) -> &'static [&'static str] {
        &[]
    }

    fn destroy(&mut self) {}
}

fn register() {
    gpuix_native::register_custom_element(|| Box::new(ShaderFactory))
        .expect("gpuixui-shader registers once");
}

#[cfg(not(target_family = "wasm"))]
#[napi_derive::module_init]
fn init() {
    register();
}

#[cfg(target_family = "wasm")]
#[wasm_bindgen::prelude::wasm_bindgen(start)]
fn start() {
    register();
}
