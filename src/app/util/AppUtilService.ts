import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppUtilService {
  public calculatePollResult(pollQuestion, pollsArray, optionData) {
    pollQuestion.options.forEach((option, index) => {
      optionData['option' + (index + 1)] = {
        option,
        votes: 0,
        percent: 0
      };
    });

    if (pollsArray.length > 0) {
      const totalVotes = pollsArray.length;
      pollsArray.forEach((x, index) => {
        optionData[x.option].votes += 1;
      });

      Object.keys(optionData).forEach((x) => {
        optionData[x].percent = (optionData[x].votes / totalVotes) * 100;
      });
    }
  }

  /**
   * Same output shape as calculatePollResult, but built from the sanitized
   * `poll_results` aggregate (option -> vote count) instead of the raw,
   * admin-only vote documents. Used by public-facing poll displays.
   */
  public applyPollResultCounts(
    pollQuestion,
    totalVotes: number,
    optionCounts: Record<string, number>,
    optionData
  ) {
    pollQuestion.options.forEach((option, index) => {
      const key = 'option' + (index + 1);
      const votes = optionCounts?.[key] || 0;
      optionData[key] = {
        option,
        votes,
        percent: totalVotes > 0 ? (votes / totalVotes) * 100 : 0
      };
    });
  }

  onFileSelected(
    event,
    component,
    imageProps?: { imageToSave: string; imageToDisplay: string }
  ) {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    component[imageProps?.imageToSave ?? 'imageToSave'] = event.target.files[0];

    fileReader.onload = () => {
      component[
        imageProps?.imageToDisplay ?? 'imageToDisplay'
      ] = fileReader.result as string;
    };
  }

  formatImageName(prefix, imageToSave) {
    return prefix + Date.now() + '.' + imageToSave.name.split('.').pop(); // add timestamp to image name to keep it unique
  }

  stopVideos() {
    const iframePlayers = document.getElementsByTagName('iframe');
    for (let i = 0; i < iframePlayers.length; i++) {
      iframePlayers
        .item(i)
        .contentWindow.postMessage(
          '{"event":"command","func":"' + 'stopVideo' + '","args":""}',
          '*'
        );
    }
  }
}
