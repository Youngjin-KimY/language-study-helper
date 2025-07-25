import sys
import os
import pysubs2
import ffmpeg
import logging
from pathlib import Path

from typing import Tuple

ROOT = str(Path(__file__).resolve().parent.parent)
DIR: str = "/video/"

def convert_srt_to_ass(srt_path: str, ass_path: str, font_size: int = 24):
    subs: pysubs2.SSAFile = pysubs2.load(srt_path, encoding="utf-8")
    for style in subs.styles.values():
        style.fontsize = font_size
    subs.save(ass_path)
    logging.info(f'converted srt to ass completed, size: {font_size}, path: {ass_path}')

def merge_ass_to_video(video_path: str, ass_path: str, output_path: str):
    logging.info(f'Merging subtitles: {output_path}, videoPath: {video_path}, assPath: {ass_path}')
    print(f'Merging subtitles: {output_path}, videoPath: {video_path}, assPath: {ass_path}')
    # stream = ffmpeg.input(video_path)
    # stream = ffmpeg.output(stream, )
    try:
        (
            ffmpeg
            .input(video_path)
            .filter('ass',f'{ass_path}')
            .output(
                output_path,
                vcodec='libx264',
                acodec='copy'
            )
            .overwrite_output()
            .run()
        )
            #         ffmpeg
            # .input(video_path)
            # .output(output_path, vf=f'ass={ass_path}',c="copy")
            # .run()
    except Exception as e:
        logging.error("error: ", e)
    logging.info("merge ass and video completed")



def run_merge_process(video_name: str, srt_name: str, font_size: int=24) -> Tuple[str, str]:

    video_path: str = os.path.join(ROOT + DIR, video_name)
    srt_path: str = os.path.join(ROOT + DIR, srt_name)
    if not os.path.exists(video_path) or not os.path.exists(srt_path):
        logging.error(f"video({video_path}) exists: {os.path.exists(video_path)}, srt({srt_path}) exists: {os.path.exists(srt_path)}")
        sys.exit(1)
    
    ass_path: str = srt_path.replace(".srt", ".ass")
    output_path: str = os.path.join(ROOT + DIR, f"merge_{video_name}")

    convert_srt_to_ass(srt_path=srt_path, ass_path=ass_path)
    merge_ass_to_video(video_path=video_path, ass_path=ass_path, output_path=output_path)

    logging.info("merged finished!!")
    return (output_path, ass_path)

def main()-> None:
    if len(sys.argv) != 3:
        logging.warning(f"input data invalidate - check: {sys.argv}")
        sys.exit(1)
    run_merge_process(video_name=sys.argv[1],srt_name=sys.argv[2])

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)s] %(asctime)s| %(message)s"
    )

    # print(os.path.join(ROOT+DIR, "test.mp4"))