import unittest
import os
from convert_merge import run_merge_process, DIR

class Test(unittest.TestCase):
    def setUp(self) -> None:
        self.merged_output_path = ""
        self.filterted_ass_path = ""

    def test_merge(self)-> None:
        video_name = "test.mp4"
        srt_name = "test.srt"
        self.merged_output_path, self.filterted_ass_path = run_merge_process(video_name, srt_name, 24)
    
        self.assertTrue(self.merged_output_path.endswith(".mp4"))
        self.assertTrue(os.path.exists(self.merged_output_path))
        
    def reset_merge_video(self)-> None:
        if os.path.exists(self.merged_output_path):
            os.remove(self.merged_output_path)
        
        if os.path.exists(self.filterted_ass_path):
            os.remove(self.filterted_ass_path)
        
if __name__ == "__main__":
    unittest.main()