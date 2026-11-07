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

#[derive(Default)]
struct Shader {
    source: gpui::SharedString,
    time: f32,
    params: [[f32; 4]; 8],
    reads_backdrop: bool,
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
        let children = std::mem::take(&mut ctx.children);
        let id = gpui::SharedString::from(format!("gpuixui_shader_{}", ctx.id));
        custom_surface(gpui::div().id(id), &ctx)
            .child(
                gpui::canvas(
                    |_, _, _| {},
                    move |bounds, _, window, _| {
                        window.paint_shader(bounds, source, time, params, reads_backdrop);
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
            "params" => {
                let values = value.as_array().map(Vec::as_slice).unwrap_or_default();
                self.params = [[0.0; 4]; 8];
                for (index, number) in values.iter().take(32).enumerate() {
                    self.params[index / 4][index % 4] = number.as_f64().unwrap_or_default() as f32;
                }
            }
            _ => {}
        }
    }

    fn supported_props(&self) -> &'static [&'static str] {
        &["source", "time", "params", "readsBackdrop"]
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
