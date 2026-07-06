import os
import subprocess
import sys
import shutil

def compile_cpp_extension() -> str:
    """
    Compiles evaluator.cpp into a shared library (DLL on Windows, SO on Linux, dylib on macOS).
    Returns the path to the compiled library, or empty string if compilation fails.
    """
    native_dir = os.path.dirname(os.path.abspath(__file__))
    cpp_source = os.path.join(native_dir, "evaluator.cpp")
    
    # Define output filename based on OS
    if sys.platform.startswith("win"):
        output_lib = os.path.join(native_dir, "evaluator.dll")
    elif sys.platform.startswith("darwin"):
        output_lib = os.path.join(native_dir, "evaluator.dylib")
    else:
        output_lib = os.path.join(native_dir, "evaluator.so")
        
    # Check if C++ source exists
    if not os.path.exists(cpp_source):
        print(f"Error: C++ source file not found at {cpp_source}")
        return ""
        
    print(f"Attempting to compile C++ extension from {cpp_source}...")
    
    # Try different compilers
    # 1. GCC (g++)
    if shutil.which("g++"):
        print("Found g++. Attempting compilation...")
        cmd = ["g++", "-O3", "-shared", "-fPIC", "-fopenmp", "-o", output_lib, cpp_source]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"Compilation successful: {output_lib}")
            return output_lib
        except subprocess.CalledProcessError as e:
            print("g++ compilation with OpenMP failed. Trying without OpenMP...")
            cmd = ["g++", "-O3", "-shared", "-fPIC", "-o", output_lib, cpp_source]
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, check=True)
                print(f"Compilation successful (no OpenMP): {output_lib}")
                return output_lib
            except Exception as ex:
                print(f"g++ compilation failed: {ex}")
                
    # 2. Clang (clang++)
    if shutil.which("clang++"):
        print("Found clang++. Attempting compilation...")
        cmd = ["clang++", "-O3", "-shared", "-fPIC", "-o", output_lib, cpp_source]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"Compilation successful: {output_lib}")
            return output_lib
        except Exception as e:
            print(f"clang++ compilation failed: {e}")

    # 3. MSVC (cl.exe)
    if shutil.which("cl"):
        print("Found MSVC (cl). Attempting compilation...")
        cmd = ["cl", "/LD", "/O2", f"/Fe:{output_lib}", cpp_source]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"Compilation successful: {output_lib}")
            # Clean up MSVC temporary files (.obj, .lib, .exp)
            for ext in [".obj", ".lib", ".exp"]:
                temp_file = os.path.join(native_dir, "evaluator" + ext)
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            return output_lib
        except Exception as e:
            print(f"MSVC compilation failed: {e}")
            
    print("No C++ compiler (g++, clang++, cl) was found or compilation failed. Benchmarking will run in fallback (optimized Python vectorization) mode.")
    return ""

if __name__ == "__main__":
    compile_cpp_extension()
