// Injected with DYLD_INSERT_LIBRARIES: reports each presented Metal frame on fd 3.
#include <Block.h>
#include <dlfcn.h>
#include <objc/message.h>
#include <objc/runtime.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>
#include <unistd.h>

typedef struct { unsigned long x, y, z, width, height, depth; } Region;

static IMP original_next_drawable;
static atomic_int frames;
static atomic_flag hooked = ATOMIC_FLAG_INIT;

static long long now_us(void) {
  struct timeval t;
  gettimeofday(&t, NULL);
  return t.tv_sec * 1000000LL + t.tv_usec;
}

static unsigned long send_ulong(id object, const char *selector) {
  return ((unsigned long (*)(id, SEL))objc_msgSend)(object, sel_registerName(selector));
}

static long non_background_pixels(id drawable) {
  id texture = ((id (*)(id, SEL))objc_msgSend)(drawable, sel_registerName("texture"));
  unsigned long width = send_ulong(texture, "width"), height = send_ulong(texture, "height");
  unsigned *pixels = malloc(width * height * 4);
  Region region = {0, 0, 0, width, height, 1};
  ((void (*)(id, SEL, void *, unsigned long, Region, unsigned long))objc_msgSend)(
      texture, sel_registerName("getBytes:bytesPerRow:fromRegion:mipmapLevel:"), pixels, width * 4, region, 0);
  long other = 0;
  for (unsigned long i = 0; i < width * height; i++) other += pixels[i] != pixels[0];
  free(pixels);
  return other;
}

static id next_drawable(id self, SEL selector) {
  ((void (*)(id, SEL, char))objc_msgSend)(self, sel_registerName("setFramebufferOnly:"), 0);
  id drawable = ((id (*)(id, SEL))original_next_drawable)(self, selector);
  int frame = atomic_fetch_add(&frames, 1);
  if (drawable && frame < 12) {
    void (^presented)(id) = Block_copy(^(id _) {
      long long at = now_us();
      char line[96];
      int length = snprintf(line, sizeof line, "frame %d %lld %ld\n", frame, at, non_background_pixels(drawable));
      (void)!write(3, line, length);
    });
    ((void (*)(id, SEL, id))objc_msgSend)(drawable, sel_registerName("addPresentedHandler:"), (id)presented);
  }
  return drawable;
}

static void hook(void) {
  Class layer = objc_getClass("CAMetalLayer");
  if (!layer || atomic_flag_test_and_set(&hooked)) return;
  Method method = class_getInstanceMethod(layer, sel_registerName("nextDrawable"));
  original_next_drawable = method_setImplementation(method, (IMP)next_drawable);
}

static void *interposed_dlopen(const char *path, int flags) {
  void *handle = dlopen(path, flags);
  hook();
  return handle;
}

__attribute__((used, section("__DATA,__interpose"))) static struct { void *replacement, *original; } interpose = {
    interposed_dlopen, dlopen};

__attribute__((constructor)) static void start(void) { hook(); }
