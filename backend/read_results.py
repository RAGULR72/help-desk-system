import time

def read_file():
    try:
        with open('test_results.txt', 'r', encoding='utf-8', errors='ignore') as f:
             print(f.read())
    except Exception as e:
        print(e)

if __name__ == "__main__":
    read_file()
